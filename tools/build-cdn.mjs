// --- Assembles the directory a CDN would serve. For each remote it runs that remote's production
// bundle script, then copies the output — container, chunks and mf-manifest.json — into
// cdn-root/<platform>/<remote>/. That layout is the URL layout: a file at
// cdn-root/ios/listApp/mf-manifest.json is served at <base>/ios/listApp/mf-manifest.json, which is
// exactly the URL the host's remotes map asks for.
//
// One version of each remote lives here, in one flat directory. Versioned releases, and the map
// that decides which version a given app may load, arrive in the next post.
//
// Usage: node tools/build-cdn.mjs [ios|android]     (no argument builds both)
//
// Then serve it and point the host at it (an Android emulator reaches this machine at 10.0.2.2,
// so the Android build gets that address instead of localhost):
//   npx http-server@14.1.1 cdn-root -p 8000 -c-1 --cors
//   ( cd apps/host && MF_CDN_BASE=http://localhost:8000 npm start )

import { execSync } from 'node:child_process';
import { cpSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const REMOTES = { listApp: 'list', partyApp: 'party' };
const ALL_PLATFORMS = ['ios', 'android'];

const [platformArg] = process.argv.slice(2);
if (platformArg && !ALL_PLATFORMS.includes(platformArg)) {
  console.error(`Unknown platform "${platformArg}". Use one of: ${ALL_PLATFORMS.join(', ')}`);
  process.exit(1);
}
const platforms = platformArg ? [platformArg] : ALL_PLATFORMS;

const cdnRoot = join(repoRoot, 'cdn-root');

for (const platform of platforms) {
  // Wipe this platform only, so building one does not delete the other's tree.
  rmSync(join(cdnRoot, platform), { recursive: true, force: true });
  mkdirSync(join(cdnRoot, platform), { recursive: true });

  for (const [remote, app] of Object.entries(REMOTES)) {
    console.log(`\n=== building ${remote} (${platform}) ===`);
    const appDir = join(repoRoot, 'apps', app);
    execSync(`npm run bundle:${platform}:prod`, { cwd: appDir, stdio: 'inherit' });
    cpSync(join(appDir, 'cdn', platform, remote), join(cdnRoot, platform, remote), {
      recursive: true,
    });
    console.log(`copied -> cdn-root/${platform}/${remote}`);
  }
}

const HOST_ADDRESS = { ios: 'http://localhost:8000', android: 'http://10.0.2.2:8000' };
console.log(`\nCDN assembled at ${cdnRoot}`);
console.log('Serve it:             npx http-server@14.1.1 cdn-root -p 8000 -c-1 --cors');
for (const platform of platforms) {
  console.log(`Point the host at it: ( cd apps/host && MF_CDN_BASE=${HOST_ADDRESS[platform]} npm start )   # ${platform}`);
}
