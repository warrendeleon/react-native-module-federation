// --- The signature over a version map, on the publishing side.
//
// A map is `{ seq, versions, sig }`. seq is the release counter, versions is what the map has
// always been (remote name to version), and sig is an Ed25519 signature over the two of them and
// over what the map is for. The bytes that are signed are not the JSON: two tools can serialise
// the same object with different key orders or whitespace, and a signature over one serialisation
// would fail against the other. The input is rebuilt from the values instead, the same way on both
// sides:
//
//   <platform>|<appVersion>|<seq>|<name>@<version>,<name>@<version>,...
//
// with the remote names sorted and the pairs joined with commas. The platform and the app version
// are in it because the CDN holds one map per app version per platform, all signed with the same
// key: without them, the map written for app 1.0.0 could be served at app 2.0.0's URL with its
// signature intact, and a 2.0.0 binary would believe it. The host builds the same string with its
// own platform and app version, so a map moved to another URL fails there.
//
// The string has separators, so what goes between them is restricted: a remote name is letters,
// digits and underscores and starts with a letter; a version is letters, digits, dots, dashes and
// underscores and starts with a letter or a digit. Without that rule a name holding "@" or "," could
// make two different maps produce the same string, and an edit that moved a boundary would keep
// the signature valid. Both tools refuse such a map before signing it, and the host refuses it
// before verifying it. apps/host/src/shell/versionMapVerify.ts holds the same two rules and builds
// the identical string, so the two sides must change together or every map stops verifying.
//
// This module is shared by tools/build-cdn.mjs, which signs every map it writes, and by
// tools/sign-version-map.mjs, which signs one map already sitting in cdn-root after it was edited
// by hand. ---

import { createPrivateKey, sign } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const SAFE_NAME = /^[A-Za-z][A-Za-z0-9_]*$/;
const SAFE_VERSION = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;

/** The file tools/gen-signing-keys.mjs writes the private half of the map-signing key to. */
export function versionMapKeyPath(repoRoot) {
  return join(repoRoot, 'code-signing', 'version-map-private.pem');
}

/** Why a versions object cannot be signed, or null when every name and version is allowed. */
export function versionsProblem(versions) {
  if (typeof versions !== 'object' || versions === null || Array.isArray(versions)) {
    return 'the versions are not an object of remote names to versions';
  }
  const entries = Object.entries(versions);
  if (entries.length === 0) {
    return 'the versions name no remote';
  }
  for (const [name, version] of entries) {
    if (!SAFE_NAME.test(name)) {
      return `the remote name "${name}" is not allowed: letters, digits and underscores, starting with a letter`;
    }
    if (typeof version !== 'string' || !SAFE_VERSION.test(version)) {
      return `the version of ${name} is not allowed: letters, digits, dots, dashes and underscores, starting with a letter or a digit, at most 64 characters`;
    }
  }
  return null;
}

/** The bytes a signature covers, as a string. The versions must have passed versionsProblem. */
export function versionMapSigningInput(platform, appVersion, seq, versions) {
  const pairs = Object.keys(versions)
    .sort()
    .map(name => `${name}@${versions[name]}`)
    .join(',');
  return `${platform}|${appVersion}|${seq}|${pairs}`;
}

// --- The release counter, read from MF_RELEASE_SEQ and refused when it is missing or not a
// positive whole number. There is no default on purpose: a default would let a publish go out with
// a counter that has not moved past the last one. Installed apps refuse a lower counter as an old
// map served again, run from the copies in the binary for that launch and keep the counter they
// hold. They accept an equal one and run the versions it names, but they go on accepting the
// earlier map at that counter too, so either can be served to them. The tool refusing to run is
// the operator's half of the guard; the device's half is in versionMapVerify.ts. ---
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

// --- The highest counter in any map under cdn-root, across every platform and app version, or
// zero when there is none. A device keeps one counter for every map it ever accepted, whatever
// app version it was running at the time, and keeps it across a binary update: a map for app
// 1.0.0 published at seq 4 means a device that moves to app 2.0.0 refuses 2.0.0's map at seq 3. So
// the counter is one number for the whole CDN, and a publish of any map must move past all of
// them. ---
export function highestPublishedSeq(repoRoot) {
  const cdnRoot = join(repoRoot, 'cdn-root');
  let highest = 0;
  if (!existsSync(cdnRoot)) {
    return highest;
  }
  for (const platform of readdirSync(cdnRoot)) {
    const maps = join(cdnRoot, platform, 'maps');
    if (!existsSync(maps)) {
      continue;
    }
    for (const appVersion of readdirSync(maps)) {
      const file = join(maps, appVersion, 'version-map.json');
      if (!existsSync(file)) {
        continue;
      }
      try {
        const { seq } = JSON.parse(readFileSync(file, 'utf8'));
        if (Number.isInteger(seq) && seq > highest) {
          highest = seq;
        }
      } catch {
        // A map that is not JSON carries no counter to compare with.
      }
    }
  }
  return highest;
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
export function signVersionMap(platform, appVersion, seq, versions, privateKey) {
  const problem = versionsProblem(versions);
  if (problem) {
    throw new Error(`cannot sign the map: ${problem}`);
  }
  const input = versionMapSigningInput(platform, appVersion, seq, versions);
  const sig = sign(null, Buffer.from(input, 'utf8'), privateKey);
  return { seq, versions, sig: sig.toString('base64') };
}
