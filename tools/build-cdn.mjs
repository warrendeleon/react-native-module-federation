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
// It also prepares the copy a release build carries, so the app can start with the CDN out of
// reach: embed-root/ and apps/host/src/shell/embedded-manifests.ts, both described where they are
// written, below. Run it before the release build that should carry them.
//
// Usage: node tools/build-cdn.mjs [ios|android]     (no argument builds both)
//
// Then serve it and point the host at it (an Android emulator reaches this machine at 10.0.2.2,
// so the Android build gets that address instead of localhost):
//   npx http-server@14.1.1 cdn-root -p 8000 -c-1 --cors
//   ( cd apps/host && MF_CDN_BASE=http://localhost:8000 MF_APP_VERSION=2.0.0 npm start )

import { execSync } from 'node:child_process';
import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { createRequire } from 'node:module';
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
// build that added the party counter's full state, and it is the one the flip ships. This tool
// builds every version from the source in front of it, so rebuilt from the finished tree all three
// carry that state: the post builds 1.0.0 and 1.1.0 before making the change, which is what keeps
// them without it. ---
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

const appVersions = Object.keys(APP_VERSION_MAPS);

// --- The copy in the binary. A release build carries one version of each remote, so it can start
// with the CDN out of reach, and the version it carries is the one its own map names: the version
// already known to run on that binary. Two outputs, both derived from that map:
//
//   embed-root/<platform>/<remote>/<version>/   the signed .bundle files, which the native build
//                                                phases copy into the app byte for byte. Only the
//                                                versions this binary runs, not the whole CDN.
//   apps/host/src/shell/embedded-manifests.ts   each embedded version and its manifest, compiled
//                                                into the host, because React Native's fetch cannot
//                                                read a manifest from a file:// URL.
//
// It prepares the binary built with the same MF_APP_VERSION, or with none set, the newest app
// version that has a map. Run it before the release build: the build phases copy whatever
// embed-root holds when they run, and when it is missing they warn and copy nothing. ---
const EMBED_APP_VERSION = process.env.MF_APP_VERSION || appVersions.at(-1);
const embeddedVersions = APP_VERSION_MAPS[EMBED_APP_VERSION];
if (!embeddedVersions) {
  console.error(`\nNo map for app version ${EMBED_APP_VERSION}, so there is nothing to embed.\n`);
  process.exit(1);
}
const bundledVersions = {};
const embeddedManifests = {};
for (const platform of ALL_PLATFORMS) {
  const cdnDir = join(repoRoot, 'cdn-root', platform);
  const embedDir = join(repoRoot, 'embed-root', platform);
  // Cleared first, whatever happens next, so a binary never carries a copy the generated file
  // below does not list.
  rmSync(embedDir, { recursive: true, force: true });
  // A platform that has never been built has no tree to take a copy from.
  if (!existsSync(cdnDir)) {
    continue;
  }
  bundledVersions[platform] = {};
  embeddedManifests[platform] = {};
  for (const [remote, version] of Object.entries(embeddedVersions)) {
    const published = join(cdnDir, remote, version);
    const embedded = join(embedDir, remote, version);
    mkdirSync(embedded, { recursive: true });
    // Every script of the version sits at the top of its directory, and the copy is all of them,
    // byte for byte: the container, its chunks, and index.bundle, which the manifest names among
    // the shared modules' assets. The assets/ folder beside them holds images the host's shared
    // copies of those libraries already carry.
    for (const file of readdirSync(published)) {
      if (file.endsWith('.bundle')) {
        copyFileSync(join(published, file), join(embedded, file));
      }
    }
    bundledVersions[platform][remote] = version;
    embeddedManifests[platform][remote] = JSON.parse(
      readFileSync(join(published, 'mf-manifest.json'), 'utf8'),
    );
    console.log(`embedded  -> embed-root/${platform}/${remote}/${version}`);
  }
}
// The generated file is committed and read like any other source file in the host, so it is
// written in the host's own format, by the host's own Prettier and settings.
const hostDir = join(repoRoot, 'apps', 'host');
const manifestsFile = join(hostDir, 'src', 'shell', 'embedded-manifests.ts');
const prettier = createRequire(join(hostDir, 'package.json'))('prettier');
const manifestsSource = `// AUTO-GENERATED by tools/build-cdn.mjs for app version ${EMBED_APP_VERSION}. Do not edit by hand.
//
// The copy of each remote baked into the host: which version the native build phases copied into
// the app, and that version's manifest, which React Native's fetch cannot read from the disk.

export const BUNDLED_VERSIONS: Record<string, Record<string, string>> = ${JSON.stringify(bundledVersions)};

export const EMBEDDED_MANIFESTS: Record<string, Record<string, unknown>> = ${JSON.stringify(embeddedManifests)};
`;
writeFileSync(
  manifestsFile,
  prettier.format(manifestsSource, {
    ...(await prettier.resolveConfig(manifestsFile)),
    filepath: manifestsFile,
  }),
);
console.log('wrote     -> apps/host/src/shell/embedded-manifests.ts');

const HOST_ADDRESS = { ios: 'http://localhost:8000', android: 'http://10.0.2.2:8000' };
console.log(`\nCDN assembled at ${join(repoRoot, 'cdn-root')}`);
console.log('Serve it:             npx http-server@14.1.1 cdn-root -p 8000 -c-1 --cors');
for (const platform of platforms) {
  console.log(
    `Point the host at it: ( cd apps/host && MF_CDN_BASE=${HOST_ADDRESS[platform]} MF_APP_VERSION=${appVersions.at(-1)} npm start )   # ${platform}`,
  );
}
console.log(`App versions with a map: ${appVersions.join(', ')}`);
console.log(`Embedded for app version ${EMBED_APP_VERSION}: build the host with MF_APP_VERSION=${EMBED_APP_VERSION}`);
