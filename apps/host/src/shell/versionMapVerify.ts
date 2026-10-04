import * as ed from '@noble/ed25519';
import { sha512 } from '@noble/hashes/sha2.js';

// --- Whether a version map can be believed, decided as plain functions so it can be tested with
// a key made for the test and no device in sight.
//
// Post 15 made the map the deploy commit: one file on the CDN says which version of each remote
// an installed app may load. Post 14's chunk signing protects the content of every chunk, and
// none of it protects the choice: anybody who can write to the bucket, or sit between the app and
// it, can serve a map that names other versions, each one validly signed, each one old. So the map
// now carries two more fields and the app checks them before it trusts a single version in it:
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
// string rebuilt from the values, the same way on both sides: the seq, then every name@version pair
// sorted by name, joined with commas. tools/version-map-signing.mjs builds the identical string.
//
// Ed25519 is verified in JavaScript, with @noble/ed25519, because Hermes has no WebCrypto. The
// library ships without a hash of its own and its synchronous path needs one, so @noble/hashes'
// SHA-512 is wired in once, here, when the module loads. ---
ed.hashes.sha512 = sha512 as typeof ed.hashes.sha512;

export interface SignedVersionMap {
  seq: number;
  versions: Record<string, string>;
  /** Standard base64 of the Ed25519 signature over versionMapSigningInput(seq, versions). */
  sig: string;
}

/** Why a map was refused, in the words the launch logs. */
export type VersionMapRejection =
  | 'not an object'
  | 'no release counter'
  | 'no versions'
  | 'no signature'
  | 'signature does not verify'
  | 'release counter is older than the last one accepted';

export type VerifyResult =
  | { ok: true; map: SignedVersionMap }
  | { ok: false; reason: VersionMapRejection };

/** The bytes a signature covers, rebuilt from the values rather than read from the file. */
export function versionMapSigningInput(seq: number, versions: Record<string, string>): Uint8Array {
  const pairs = Object.keys(versions)
    .sort()
    .map(name => `${name}@${versions[name]}`)
    .join(',');
  return new TextEncoder().encode(`${seq}|${pairs}`);
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
// passed in rather than imported so a test can hand in a key it made. highestAcceptedSeq is what
// the device remembers, zero on a fresh install, which accepts any signed map: first-contact trust
// is the embedded key's job, and the counter protects a device that has already seen a newer map.
//
// The shape is checked first, in the order the fields are needed, and every refusal names its
// reason: a launch that lands in bundled mode because of a map it could not believe should say so,
// and say which check failed. ---
export function verifyVersionMap(
  raw: unknown,
  publicKey: string,
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
  // Every value the signature covers has to be a string, or the string it covers is not the one
  // the publisher signed; a map that fails this is refused as unsigned rather than passed to the
  // verifier to fail less clearly.
  const entries = Object.entries(versions as Record<string, unknown>);
  if (entries.some(([, version]) => typeof version !== 'string')) {
    return { ok: false, reason: 'no versions' };
  }
  const signedVersions = Object.fromEntries(entries) as Record<string, string>;

  let valid = false;
  try {
    valid = ed.verify(
      base64ToBytes(sig),
      versionMapSigningInput(seq, signedVersions),
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
