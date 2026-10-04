// --- The signature over a version map, on the publishing side.
//
// A map is `{ seq, versions, sig }`. seq is the release counter, versions is what the map has
// always been (remote name to version), and sig is an Ed25519 signature over the two of them.
// The bytes that are signed are not the JSON: two tools can serialise the same object with
// different key orders or whitespace, and a signature over one serialisation would fail against
// the other. The input is rebuilt from the values instead, the same way on both sides:
//
//   <seq>|<name>@<version>,<name>@<version>,...     remote names sorted, joined with commas
//
// apps/host/src/shell/versionMapVerify.ts builds the same string on the device, so the two must
// change together or every map stops verifying.
//
// This module is shared by tools/build-cdn.mjs, which signs every map it writes, and by
// tools/sign-version-map.mjs, which signs one map already sitting in cdn-root after it was edited
// by hand. ---

import { createPrivateKey, sign } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/** The file tools/gen-signing-keys.mjs writes the private half of the map-signing key to. */
export function versionMapKeyPath(repoRoot) {
  return join(repoRoot, 'code-signing', 'version-map-private.pem');
}

/** The bytes a signature covers, as a string: the seq, then the sorted name@version pairs. */
export function versionMapSigningInput(seq, versions) {
  const pairs = Object.keys(versions)
    .sort()
    .map(name => `${name}@${versions[name]}`)
    .join(',');
  return `${seq}|${pairs}`;
}

// --- The release counter, read from MF_RELEASE_SEQ and refused when it is missing or not a
// positive whole number. There is no default on purpose: a default would let a publish go out with
// the same counter as the one before it, and installed apps treat a map whose counter has not
// moved as the release they already have. The tool refusing to run is the operator's half of the
// guard; the device's half is in versionMapVerify.ts. ---
export function releaseSeqFromEnv(env = process.env) {
  const raw = env.MF_RELEASE_SEQ;
  if (raw === undefined || raw === '') {
    return {
      error:
        'MF_RELEASE_SEQ is not set. Every published map carries a release counter, and it has to be higher than the last one published: MF_RELEASE_SEQ=<n> node tools/...',
    };
  }
  if (!/^[1-9][0-9]*$/.test(raw) || !Number.isSafeInteger(Number(raw))) {
    return {
      error: `MF_RELEASE_SEQ must be a positive whole number, not "${raw}".`,
    };
  }
  return { seq: Number(raw) };
}

/** The private key, or an error message naming the command that makes it. */
export function readVersionMapPrivateKey(repoRoot) {
  const path = versionMapKeyPath(repoRoot);
  if (!existsSync(path)) {
    return {
      error: `Missing ${path}. Run: node tools/gen-signing-keys.mjs (it makes the map-signing key beside the chunk-signing one, and embeds the public half in the host).`,
    };
  }
  return { key: createPrivateKey(readFileSync(path)) };
}

/** The signed map: the seq, the versions as given, and the signature in standard base64. */
export function signVersionMap(seq, versions, privateKey) {
  const sig = sign(null, Buffer.from(versionMapSigningInput(seq, versions), 'utf8'), privateKey);
  return { seq, versions, sig: sig.toString('base64') };
}
