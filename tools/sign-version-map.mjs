// --- Signs one version map already sitting in cdn-root, after it was edited by hand.
//
// Shipping or rolling back a remote version is still the post 15 operation: put the version's
// directory on the CDN, then edit one line of the map. The map is now signed, so the edit has a
// second step: sign it again, with a release counter higher than the last one published. This
// tool is that step, for one map file, where tools/build-cdn.mjs rebuilds the whole tree and
// signs every map it writes.
//
// It reads the map file as it is, signed or not. A signed map's `versions` are taken and its old
// seq and sig dropped; a plain map, the shape post 15 wrote, is read whole as the versions. What
// is written back is `{ seq, versions, sig }` with the seq from MF_RELEASE_SEQ.
//
// Usage: MF_RELEASE_SEQ=<n> node tools/sign-version-map.mjs <ios|android> <appVersion>
//   e.g. MF_RELEASE_SEQ=2 node tools/sign-version-map.mjs ios 2.0.0

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  readVersionMapPrivateKey,
  releaseSeqFromEnv,
  signVersionMap,
} from './version-map-signing.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const PLATFORMS = ['ios', 'android'];

const [platform, appVersion] = process.argv.slice(2);
if (!PLATFORMS.includes(platform) || !appVersion) {
  console.error(
    `Usage: MF_RELEASE_SEQ=<n> node tools/sign-version-map.mjs <${PLATFORMS.join('|')}> <appVersion>`,
  );
  process.exit(1);
}

const mapPath = join(repoRoot, 'cdn-root', platform, 'maps', appVersion, 'version-map.json');
if (!existsSync(mapPath)) {
  console.error(`No map at ${mapPath}. Build the tree first: node tools/build-cdn.mjs ${platform}`);
  process.exit(1);
}

const { seq, error: seqError } = releaseSeqFromEnv();
if (seqError) {
  console.error(seqError);
  process.exit(1);
}
const { key, error: keyError } = readVersionMapPrivateKey(repoRoot);
if (keyError) {
  console.error(keyError);
  process.exit(1);
}

// --- The versions, from either shape. A map is a plain object of remote names to versions, and
// nothing else: a value that is not a string, or a map with no remote in it, is refused here rather
// than signed and shipped, because a signature makes whatever it covers trusted. ---
let raw;
try {
  raw = JSON.parse(readFileSync(mapPath, 'utf8'));
} catch (cause) {
  console.error(`${mapPath} is not JSON: ${cause.message}`);
  process.exit(1);
}
const isObject = value => typeof value === 'object' && value !== null && !Array.isArray(value);
const versions = isObject(raw) && 'versions' in raw ? raw.versions : raw;
if (
  !isObject(versions) ||
  Object.keys(versions).length === 0 ||
  Object.values(versions).some(version => typeof version !== 'string')
) {
  console.error(
    `${mapPath} does not hold a map of remote names to versions, so there is nothing to sign.`,
  );
  process.exit(1);
}
if (isObject(raw) && 'seq' in raw && Number.isInteger(raw.seq) && seq <= raw.seq) {
  // The counter has to move: a map re-signed with the same seq is the release the installed apps
  // already have, and one signed with a lower seq is one they refuse as a replay.
  console.error(
    `${mapPath} is already at seq ${raw.seq}. MF_RELEASE_SEQ must be higher than every seq published before it, rollbacks included.`,
  );
  process.exit(1);
}

const signed = signVersionMap(seq, versions, key);
writeFileSync(mapPath, `${JSON.stringify(signed, null, 2)}\n`);
console.log(`signed -> cdn-root/${platform}/maps/${appVersion}/version-map.json (seq ${seq})`);
for (const [remote, version] of Object.entries(versions)) {
  console.log(`  ${remote} ${version}`);
}
