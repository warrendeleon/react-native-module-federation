// --- Regression tests for build-cdn.mjs, run as a child process against a temporary tree:
// build-cdn.mjs and version-map-signing.mjs copied into tools/ beside a code-signing/ key, two
// stand-in remote apps whose bundle script writes a container and a manifest instead of compiling
// one, and a host whose node_modules is the real host's, so the generated file is formatted the way
// the real tool formats it. What they prove is the wiring the unit tests cannot: the counter is
// checked before anything is built, and every map the tool writes is signed for its platform and
// app version.
// Run: node --test tools/build-cdn.test.mjs

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { generateKeyPairSync, verify } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

import { versionMapSigningInput } from './version-map-signing.mjs';

const tools = dirname(fileURLToPath(import.meta.url));
const repoRoot = dirname(tools);

// A remote app whose production bundle is a script that writes the files build-cdn reads: a
// container, a manifest, a chunk, and a source map that must not be published.
const BUNDLE_SCRIPT = `
const { mkdirSync, writeFileSync } = require('node:fs');
const { join } = require('node:path');
const remote = process.env.REMOTE_NAME;
const version = process.env.MF_REMOTE_VERSION;
const dir = join('cdn', process.env.BUNDLE_PLATFORM, remote, version);
mkdirSync(dir, { recursive: true });
writeFileSync(join(dir, remote + '.container.js.bundle'), 'container ' + version);
writeFileSync(join(dir, 'main.chunk.bundle'), 'chunk ' + version);
writeFileSync(join(dir, 'mf-manifest.json'), JSON.stringify({ id: remote, version }));
writeFileSync(join(dir, remote + '.container.js.bundle.map'), '{}');
`;

function sandbox({ withKey = true } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'build-cdn-'));
  mkdirSync(join(root, 'tools'));
  for (const file of ['build-cdn.mjs', 'version-map-signing.mjs']) {
    cpSync(join(tools, file), join(root, 'tools', file));
  }
  for (const [remote, app] of [['listApp', 'list'], ['partyApp', 'party']]) {
    const dir = join(root, 'apps', app);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'bundle.cjs'), BUNDLE_SCRIPT);
    writeFileSync(
      join(dir, 'package.json'),
      JSON.stringify({
        name: app,
        scripts: {
          'bundle:ios:prod': `REMOTE_NAME=${remote} BUNDLE_PLATFORM=ios node bundle.cjs`,
          'bundle:android:prod': `REMOTE_NAME=${remote} BUNDLE_PLATFORM=android node bundle.cjs`,
        },
      }),
    );
  }
  const host = join(root, 'apps', 'host');
  mkdirSync(join(host, 'src', 'shell'), { recursive: true });
  cpSync(join(repoRoot, 'apps', 'host', 'package.json'), join(host, 'package.json'));
  cpSync(join(repoRoot, 'apps', 'host', '.prettierrc.js'), join(host, '.prettierrc.js'));
  symlinkSync(join(repoRoot, 'apps', 'host', 'node_modules'), join(host, 'node_modules'));
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  if (withKey) {
    mkdirSync(join(root, 'code-signing'));
    writeFileSync(join(root, 'code-signing', 'version-map-private.pem'), privateKey.export({ type: 'pkcs8', format: 'pem' }));
  }
  const run = (env, args = ['ios']) =>
    spawnSync(process.execPath, [join(root, 'tools', 'build-cdn.mjs'), ...args], {
      encoding: 'utf8',
      cwd: root,
      env: { ...process.env, MF_RELEASE_SEQ: '', ...env },
    });
  const readMap = (appVersion, platform = 'ios') =>
    JSON.parse(readFileSync(join(root, 'cdn-root', platform, 'maps', appVersion, 'version-map.json'), 'utf8'));
  const verifies = (signed, appVersion, platform = 'ios') =>
    verify(null, Buffer.from(versionMapSigningInput(platform, appVersion, signed.seq, signed.versions)), publicKey, Buffer.from(signed.sig, 'base64'));
  return { root, run, readMap, verifies, cleanup: () => rmSync(root, { recursive: true, force: true }) };
}

test('refuses to run without a counter, before anything is built', () => {
  const s = sandbox();
  try {
    const r = s.run({});
    assert.equal(r.status, 1);
    assert.match(r.stderr, /MF_RELEASE_SEQ is not set/);
    assert.equal(existsSync(join(s.root, 'cdn-root')), false);
    assert.equal(existsSync(join(s.root, 'apps', 'list', 'cdn')), false);
  } finally {
    s.cleanup();
  }
});

test('refuses to run without the map-signing key, naming the command that makes it', () => {
  const s = sandbox({ withKey: false });
  try {
    const r = s.run({ MF_RELEASE_SEQ: '1' });
    assert.equal(r.status, 1);
    assert.match(r.stderr, /gen-signing-keys\.mjs/);
    assert.equal(existsSync(join(s.root, 'cdn-root')), false);
  } finally {
    s.cleanup();
  }
});

test('writes every map signed for its platform and app version, at the counter given', () => {
  const s = sandbox();
  try {
    const r = s.run({ MF_RELEASE_SEQ: '7' });
    assert.equal(r.status, 0, r.stderr + r.stdout);
    for (const appVersion of ['1.0.0', '2.0.0']) {
      const signed = s.readMap(appVersion);
      assert.deepEqual(Object.keys(signed), ['seq', 'versions', 'sig']);
      assert.equal(signed.seq, 7);
      assert.ok(s.verifies(signed, appVersion), `${appVersion} verifies`);
      // Signed for its own app version, not for the other one.
      const other = appVersion === '1.0.0' ? '2.0.0' : '1.0.0';
      assert.equal(s.verifies(signed, other), false);
    }
    assert.deepEqual(s.readMap('2.0.0').versions, { listApp: '1.2.0', partyApp: '1.0.0' });
    assert.match(r.stdout, /signed {4}-> cdn-root\/ios\/maps\/2\.0\.0\/version-map\.json \(seq 7\)/);
    // Every version was published without its source map, and the copy was staged.
    const published = readdirSync(join(s.root, 'cdn-root', 'ios', 'listApp', '1.2.0'));
    assert.ok(published.includes('listApp.container.js.bundle'));
    assert.ok(!published.some(file => file.endsWith('.map')));
    assert.ok(existsSync(join(s.root, 'embed-root', 'ios', 'listApp', '1.2.0', 'mf-manifest.json')));
    assert.match(readFileSync(join(s.root, 'apps', 'host', 'src', 'shell', 'embedded-versions.ts'), 'utf8'), /listApp: '1\.2\.0'/);
  } finally {
    s.cleanup();
  }
});

test('with no platform named it builds both, and signs each platform\'s maps for that platform', () => {
  const s = sandbox();
  try {
    const r = s.run({ MF_RELEASE_SEQ: '3' }, []);
    assert.equal(r.status, 0, r.stderr + r.stdout);
    for (const platform of ['ios', 'android']) {
      const signed = s.readMap('2.0.0', platform);
      assert.equal(signed.seq, 3);
      assert.ok(s.verifies(signed, '2.0.0', platform), `${platform} verifies as itself`);
      const other = platform === 'ios' ? 'android' : 'ios';
      assert.equal(s.verifies(signed, '2.0.0', other), false, `${platform} does not verify as ${other}`);
      assert.ok(existsSync(join(s.root, 'embed-root', platform, 'partyApp', '1.0.0', 'mf-manifest.json')));
    }
    const generated = readFileSync(join(s.root, 'apps', 'host', 'src', 'shell', 'embedded-versions.ts'), 'utf8');
    assert.match(generated, /ios: \{ listApp: '1\.2\.0', partyApp: '1\.0\.0' \}/);
    assert.match(generated, /android: \{ listApp: '1\.2\.0', partyApp: '1\.0\.0' \}/);
  } finally {
    s.cleanup();
  }
});
