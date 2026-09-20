// --- Assembles the directory a CDN would serve.
//
// The layout is the URL layout, and it now has a version in it:
//
//   cdn-root/<platform>/<remote>/<version>/     the container, its chunks and mf-manifest.json
//   cdn-root/<platform>/maps/<appVersion>/      version-map.json, one per released app version
//
// A file at cdn-root/ios/listApp/1.2.0/mf-manifest.json is served at
// <base>/ios/listApp/1.2.0/mf-manifest.json, which is the URL the host builds at launch out of
// the version the map gave it.
//
// Two lists below, and the difference between them is the whole idea. REMOTE_VERSIONS is what the
// CDN holds: every version ever published, kept until nobody is running it. APP_VERSION_MAPS is
// what each released binary is allowed to load out of that. Shipping a remote to installed apps
// is a new entry in the first list and one edited line in the second.
//
// Usage: node tools/build-cdn.mjs [ios|android]     (no argument builds both)
//
// Then serve it and point the host at it (an Android emulator reaches this machine at 10.0.2.2,
// so the Android build gets that address instead of localhost):
//   npx http-server@14.1.1 cdn-root -p 8000 -c-1 --cors
//   ( cd apps/host && MF_CDN_BASE=http://localhost:8000 MF_APP_VERSION=2.0.0 npm start )

import { execSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const REMOTE_APPS = { listApp: 'list', partyApp: 'party' };
const ALL_PLATFORMS = ['ios', 'android'];

// --- Every version of each remote the CDN holds. A version directory is written once and then
// left alone: installed apps are loading those exact files, so a rebuild of a published version
// is a silent change to code somebody is already running. New work gets a new number.
//
// listApp has three because this post ships two releases of it. 1.0.0 and 1.1.0 are the same
// screen with different stamps on it, which is what the two-binaries demo needs; 1.2.0 is the
// build that added the party counter's full state, and it is the one the flip ships. ---
const REMOTE_VERSIONS = {
  listApp: ['1.0.0', '1.1.0', '1.2.0'],
  partyApp: ['1.0.0'],
};

// --- What each released app version may load. The host asks for its own entry by name at every
// launch, so an old binary keeps being handed the versions it was built against, however far the
// newest release has moved on. An entry is retired when nobody is left on that app version, the
// same way an old API endpoint is.
//
// 2.0.0 pointed at listApp 1.1.0 until the flip; the line below is what changed, and changing it
// back is the rollback. Editing it here rebuilds the whole tree, which is the wrong tool for that
// job: the operation the post performs is an edit to the map file already sitting in cdn-root,
// because that file is what a running app reads. This is the seeding of a CDN, not an operation
// against one.
//
// There is nothing else in the map. No signature over it, no counter, nothing that would let the
// app tell a map written here from one written by anybody else who can reach the bucket. That is
// a real hole and it is left open on purpose: it is the subject of the last post in the series. ---
const APP_VERSION_MAPS = {
  '1.0.0': { listApp: '1.0.0', partyApp: '1.0.0' },
  '2.0.0': { listApp: '1.2.0', partyApp: '1.0.0' },
};

// --- Never published: source maps are four fifths of the built tree, they are a debugging
// artefact for a crash reporter rather than something a client downloads, and on a public bucket
// they hand the whole readable source to anyone who asks for it. mf-stats.json is build analysis
// in the same position. The remote's own index.bundle stays, because mf-manifest.json names it
// among the shared assets and nothing here has established that no path fetches it. ---
const NEVER_PUBLISHED = /\.map$|^mf-stats\.json$/;

const [platformArg] = process.argv.slice(2);
if (platformArg && !ALL_PLATFORMS.includes(platformArg)) {
  console.error(`Unknown platform "${platformArg}". Use one of: ${ALL_PLATFORMS.join(', ')}`);
  process.exit(1);
}
const platforms = platformArg ? [platformArg] : ALL_PLATFORMS;

// --- A map naming a version the CDN does not hold is the failure the post demonstrates by hand,
// and it is worth catching here rather than at a user's launch. Checked before anything is built,
// so a typo costs a second instead of two bundle runs. ---
const unknownRemotes = Object.keys(REMOTE_VERSIONS).filter(remote => !REMOTE_APPS[remote]);
if (unknownRemotes.length > 0) {
  console.error(
    `\nNo app to build for: ${unknownRemotes.join(', ')}. Add it to REMOTE_APPS, or remove it from REMOTE_VERSIONS.\n`,
  );
  process.exit(1);
}

const missing = Object.entries(APP_VERSION_MAPS).flatMap(([appVersion, versions]) =>
  Object.entries(versions)
    .filter(([remote, version]) => !REMOTE_VERSIONS[remote]?.includes(version))
    .map(([remote, version]) => `  app ${appVersion} asks for ${remote} ${version}`),
);
if (missing.length > 0) {
  console.error('\nThese versions are mapped but not published:');
  console.error(missing.join('\n'));
  console.error('\nAdd them to REMOTE_VERSIONS, or point the map at a version that exists.\n');
  process.exit(1);
}

for (const platform of platforms) {
  // Wipe this platform only, so building one does not delete the other's tree.
  rmSync(join(repoRoot, 'cdn-root', platform), { recursive: true, force: true });
  mkdirSync(join(repoRoot, 'cdn-root', platform), { recursive: true });

  for (const [remote, versions] of Object.entries(REMOTE_VERSIONS)) {
    const appDir = join(repoRoot, 'apps', REMOTE_APPS[remote]);
    for (const version of versions) {
      console.log(`\n=== building ${remote} ${version} (${platform}) ===`);
      // Named once: the directory that is cleared, written and then read is one place, so no
      // later edit can move the build's output out from under the copy that follows it.
      const built = join(appDir, 'cdn', platform, remote, version);
      // Cleared first, because Rspack writes into a directory rather than replacing it, so a file
      // an earlier build emitted and this one does not would survive and be published beside the
      // real ones, for no reason anyone could work out from the source.
      rmSync(built, { recursive: true, force: true });
      // MF_REMOTE_VERSION decides both what the bundle says about itself and where it is written,
      // so one variable cannot produce a build that is stamped one version and filed under another.
      execSync(`npm run bundle:${platform}:prod`, {
        cwd: appDir,
        stdio: 'inherit',
        env: { ...process.env, MF_REMOTE_VERSION: version },
      });
      // The build reported success, so a missing directory here means its output path and this
      // path have drifted apart, which is worth saying in one line rather than as a stack trace.
      if (!existsSync(built)) {
        console.error(`\n${remote} built but wrote nothing to ${built}.`);
        console.error("Check the output path in that app's rspack.config.mjs.\n");
        process.exit(1);
      }
      cpSync(built, join(repoRoot, 'cdn-root', platform, remote, version), {
        recursive: true,
        filter: source => !NEVER_PUBLISHED.test(source.split('/').pop()),
      });
      console.log(`published -> cdn-root/${platform}/${remote}/${version}`);
    }
  }

  for (const [appVersion, versions] of Object.entries(APP_VERSION_MAPS)) {
    const dir = join(repoRoot, 'cdn-root', platform, 'maps', appVersion);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'version-map.json'), `${JSON.stringify(versions, null, 2)}\n`);
    console.log(`wrote     -> cdn-root/${platform}/maps/${appVersion}/version-map.json`);
  }
}

const HOST_ADDRESS = { ios: 'http://localhost:8000', android: 'http://10.0.2.2:8000' };
const appVersions = Object.keys(APP_VERSION_MAPS);
console.log(`\nCDN assembled at ${join(repoRoot, 'cdn-root')}`);
console.log('Serve it:             npx http-server@14.1.1 cdn-root -p 8000 -c-1 --cors');
for (const platform of platforms) {
  console.log(
    `Point the host at it: ( cd apps/host && MF_CDN_BASE=${HOST_ADDRESS[platform]} MF_APP_VERSION=${appVersions.at(-1)} npm start )   # ${platform}`,
  );
}
console.log(`App versions with a map: ${appVersions.join(', ')}`);
