import * as ed from '@noble/ed25519';
import { sha512 } from '@noble/hashes/sha2.js';

import { SAFE_VERSION } from './remoteLocator';

// --- Whether a version map can be believed, decided as plain functions so it can be tested with
// a key made for the test and without a device.
//
// Post 15 made the map the deploy commit: one file on the CDN says which version of each remote
// an installed app may load. Post 14's chunk signing protects the content of every chunk, and
// none of it protects the choice: anybody who can write to the bucket, or sit between the app and
// it, can serve a map that names other versions the bucket holds, each one validly signed: an old
// one, or one not yet released. So the map now carries two more fields and the app checks them
// before it trusts a single version in it:
//
//   sig   an Ed25519 signature made by the key that tools/gen-signing-keys.mjs keeps on the
//         publishing machine, checked here against the public half compiled into the binary. A
//         map signed by anybody else, or edited after it was signed, fails.
//   seq   the release counter. Every publish carries a higher one, and the device remembers the
//         highest it has accepted. A map whose counter is lower than that is an old map being
//         served again, however good its signature, and fails too. Equal is accepted: the same
//         map fetched again is not an attack. The counter orders publishes, not versions, which is
//         what lets a deliberate rollback through: a higher seq that names older versions.
//
// The signature is not over the JSON. Two tools can write the same map with different key orders
// or whitespace, and a signature over one of them would fail against the other. It is over a
// string rebuilt from the values, the same way on both sides: the platform, the app version, the
// seq, then every name@version pair sorted by name, joined with commas. The platform and the app
// version are in it because the CDN holds one map per app version per platform, all signed with the
// same key: without them the map written for app 1.0.0, served at app 2.0.0's URL, would verify on a
// 2.0.0 binary. tools/version-map-signing.mjs builds the identical string.
//
// The string has separators, so what goes between them is restricted to the same two shapes the
// tools accept: a remote name of letters, digits and underscores starting with a letter, and the
// version shape parseVersionMap in remoteLocator.ts already requires before a version goes into a
// URL. A name holding "@" or "," could otherwise make two different maps produce the same string,
// and an edit that moved a boundary would keep the signature valid. Such a map is refused before
// the verifier sees it.
//
// Ed25519 is verified in JavaScript, with @noble/ed25519, because Hermes has no WebCrypto. The
// library ships without a hash of its own and its synchronous path needs one, so @noble/hashes'
// SHA-512 is wired in once, here, when the module loads. ---
ed.hashes.sha512 = sha512 as typeof ed.hashes.sha512;

const SAFE_NAME = /^[A-Za-z][A-Za-z0-9_]*$/;

export interface SignedVersionMap {
  seq: number;
  versions: Record<string, string>;
  /** Standard base64 of the Ed25519 signature over versionMapSigningInput(...). */
  sig: string;
}

/** What the map is for: the string is bound to the binary that fetches it. */
export interface MapIdentity {
  platform: string;
  appVersion: string;
}

/** Why a map was refused, in the words the launch logs. */
export type VersionMapRejection =
  | 'not an object'
  | 'no release counter'
  | 'no versions'
  | 'a remote name or version is not allowed'
  | 'no signature'
  | 'signature does not verify'
  | 'release counter is older than the last one accepted';

export type VerifyResult =
  | { ok: true; map: SignedVersionMap }
  | { ok: false; reason: VersionMapRejection };

/** The bytes a signature covers, rebuilt from the values rather than read from the file. */
export function versionMapSigningInput(
  identity: MapIdentity,
  seq: number,
  versions: Record<string, string>,
): Uint8Array {
  const pairs = Object.keys(versions)
    .sort()
    .map(name => `${name}@${versions[name]}`)
    .join(',');
  return new TextEncoder().encode(`${identity.platform}|${identity.appVersion}|${seq}|${pairs}`);
}

// atob exists in Hermes and in Node, and takes standard base64. The public key arrives in base64url,
// the form a JWK carries a raw key in, so it is turned into standard base64 first.
function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function base64UrlToBytes(base64url: string): Uint8Array {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  return base64ToBytes(base64 + '='.repeat((4 - (base64.length % 4)) % 4));
}

// --- The decision for one fetched map. publicKey is the embedded verifying key in base64url,
// passed in rather than imported so a test can hand in a key it made. identity is the platform and
// app version the host fetched the map for. highestAcceptedSeq is what the device remembers, zero
// on a fresh install, which accepts any signed map: first-contact trust is the embedded key's job,
// and the counter protects a device that has already seen a newer map.
//
// The shape is checked first, in the order the fields are needed, and every refusal names its
// reason: a launch that lands in bundled mode because of a map it could not believe should say so,
// and say which check failed. ---
export function verifyVersionMap(
  raw: unknown,
  publicKey: string,
  identity: MapIdentity,
  highestAcceptedSeq: number,
): VerifyResult {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return { ok: false, reason: 'not an object' };
  }
  const { seq, versions, sig } = raw as Partial<Record<keyof SignedVersionMap, unknown>>;
  if (typeof seq !== 'number' || !Number.isInteger(seq) || seq < 0) {
    return { ok: false, reason: 'no release counter' };
  }
  if (typeof versions !== 'object' || versions === null || Array.isArray(versions)) {
    return { ok: false, reason: 'no versions' };
  }
  if (typeof sig !== 'string' || sig.length === 0) {
    return { ok: false, reason: 'no signature' };
  }
  // Every name and version has to be of the shape the signing string can carry unambiguously, and
  // every version a string: a map that fails this cannot be the one the publisher signed, and it
  // is refused before the verifier sees it rather than passed on to fail less clearly.
  const entries = Object.entries(versions as Record<string, unknown>);
  if (
    entries.some(
      ([name, version]) =>
        !SAFE_NAME.test(name) || typeof version !== 'string' || !SAFE_VERSION.test(version),
    )
  ) {
    return { ok: false, reason: 'a remote name or version is not allowed' };
  }
  const signedVersions = Object.fromEntries(entries) as Record<string, string>;

  let valid = false;
  try {
    valid = ed.verify(
      base64ToBytes(sig),
      versionMapSigningInput(identity, seq, signedVersions),
      base64UrlToBytes(publicKey),
    );
  } catch {
    // A signature or a key that is not even the right length throws rather than returning false.
    valid = false;
  }
  if (!valid) {
    return { ok: false, reason: 'signature does not verify' };
  }
  if (seq < highestAcceptedSeq) {
    return { ok: false, reason: 'release counter is older than the last one accepted' };
  }
  return { ok: true, map: { seq, versions: signedVersions, sig } };
}
