// --- Regression tests for the signing side: the shared module, and sign-version-map.mjs run as a
// child process against a temporary cdn-root. Run: node --test tools/version-map-signing.test.mjs

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createPublicKey, generateKeyPairSync, verify } from 'node:crypto';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

import {
  highestPublishedSeq,
  releaseSeqFromEnv,
  signVersionMap,
  versionMapSigningInput,
  versionsProblem,
} from './version-map-signing.mjs';

const tools = dirname(fileURLToPath(import.meta.url));
const VERSIONS = { listApp: '1.2.0', partyApp: '1.0.0' };

test('the signing input is the platform, the app version, the counter, then the sorted pairs', () => {
  assert.equal(
    versionMapSigningInput('ios', '2.0.0', 3, { partyApp: '1.0.0', listApp: '1.2.0' }),
    'ios|2.0.0|3|listApp@1.2.0,partyApp@1.0.0',
  );
});

test('a signed map carries the seq, the versions as given, and a signature over the input', () => {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  const signed = signVersionMap('ios', '2.0.0', 4, VERSIONS, privateKey);
  assert.deepEqual(Object.keys(signed), ['seq', 'versions', 'sig']);
  assert.equal(signed.seq, 4);
  assert.deepEqual(signed.versions, VERSIONS);
  const input = Buffer.from(versionMapSigningInput('ios', '2.0.0', 4, VERSIONS));
  assert.ok(verify(null, input, publicKey, Buffer.from(signed.sig, 'base64')));
  // The same map signed for another binary is a different signature.
  const other = Buffer.from(versionMapSigningInput('ios', '1.0.0', 4, VERSIONS));
  assert.equal(verify(null, other, publicKey, Buffer.from(signed.sig, 'base64')), false);
});

test('a name or version the signing string cannot carry is refused before signing', () => {
  assert.equal(versionsProblem(VERSIONS), null);
  assert.match(versionsProblem({ 'listApp@1.2.0,otherApp': '3.0.0' }), /remote name .* is not allowed/);
  assert.match(versionsProblem({ '1listApp': '1.0.0' }), /remote name/);
  assert.match(versionsProblem({ listApp: '1.0.0|x' }), /version of listApp/);
  assert.match(versionsProblem({ listApp: 1 }), /version of listApp/);
  assert.match(versionsProblem({}), /name no remote/);
  assert.match(versionsProblem([]), /not an object/);
  const { privateKey } = generateKeyPairSync('ed25519');
  assert.throws(() => signVersionMap('ios', '2.0.0', 1, { 'a,b': '1.0.0' }, privateKey), /cannot sign/);
});

test('the release counter is required and must be a positive whole number', () => {
  assert.match(releaseSeqFromEnv({}).error, /MF_RELEASE_SEQ is not set/);
  assert.match(releaseSeqFromEnv({ MF_RELEASE_SEQ: '' }).error, /is not set/);
  for (const bad of ['0', '-1', '1.5', 'two', '01']) {
    assert.match(releaseSeqFromEnv({ MF_RELEASE_SEQ: bad }).error, /positive whole number/, bad);
  }
  assert.deepEqual(releaseSeqFromEnv({ MF_RELEASE_SEQ: '12' }), { seq: 12 });
});

// --- sign-version-map.mjs against a temporary tree: tools/ copied beside a code-signing/ key and
// a cdn-root/ holding one map, the way the repository holds them. ---
function sandbox(map) {
  const root = mkdtempSync(join(tmpdir(), 'sign-version-map-'));
  mkdirSync(join(root, 'tools'));
  for (const file of ['sign-version-map.mjs', 'version-map-signing.mjs']) {
    cpSync(join(tools, file), join(root, 'tools', file));
  }
  mkdirSync(join(root, 'code-signing'));
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  writeFileSync(join(root, 'code-signing', 'version-map-private.pem'), privateKey.export({ type: 'pkcs8', format: 'pem' }));
  const mapDir = join(root, 'cdn-root', 'ios', 'maps', '2.0.0');
  mkdirSync(mapDir, { recursive: true });
  const mapPath = join(mapDir, 'version-map.json');
  writeFileSync(mapPath, `${JSON.stringify(map, null, 2)}\n`);
  const verifies = (signed, platform = 'ios', appVersion = '2.0.0') =>
    verify(
      null,
      Buffer.from(versionMapSigningInput(platform, appVersion, signed.seq, signed.versions)),
      publicKey,
      Buffer.from(signed.sig, 'base64'),
    );
  const run = (seq, args = ['ios', '2.0.0']) =>
    spawnSync(process.execPath, [join(root, 'tools', 'sign-version-map.mjs'), ...args], {
      encoding: 'utf8',
      env: { ...process.env, MF_RELEASE_SEQ: seq },
    });
  const readMap = () => JSON.parse(readFileSync(mapPath, 'utf8'));
  return { root, run, readMap, verifies, publicKey, cleanup: () => rmSync(root, { recursive: true, force: true }) };
}

test('signs a plain map, the shape post 15 wrote, in place', () => {
  const s = sandbox(VERSIONS);
  try {
    const r = s.run('2');
    assert.equal(r.status, 0, r.stderr);
    const signed = s.readMap();
    assert.deepEqual(signed.versions, VERSIONS);
    assert.equal(signed.seq, 2);
    assert.ok(s.verifies(signed));
    // Bound to the platform and app version in the path, so it does not verify elsewhere.
    assert.equal(s.verifies(signed, 'android', '2.0.0'), false);
    assert.equal(s.verifies(signed, 'ios', '1.0.0'), false);
  } finally {
    s.cleanup();
  }
});

test('re-signs an edited signed map with a higher counter, dropping the old signature', () => {
  const s = sandbox(VERSIONS);
  try {
    s.run('2');
    const edited = { ...s.readMap(), versions: { ...VERSIONS, listApp: '1.3.0' } };
    writeFileSync(join(s.root, 'cdn-root', 'ios', 'maps', '2.0.0', 'version-map.json'), JSON.stringify(edited));
    const r = s.run('3');
    assert.equal(r.status, 0, r.stderr);
    const signed = s.readMap();
    assert.equal(signed.seq, 3);
    assert.equal(signed.versions.listApp, '1.3.0');
    assert.ok(s.verifies(signed));
    assert.notEqual(signed.sig, edited.sig);
  } finally {
    s.cleanup();
  }
});

test('refuses a counter that does not move past the highest in any map under cdn-root', () => {
  const s = sandbox(VERSIONS);
  try {
    s.run('5');
    const before = s.readMap();
    for (const seq of ['5', '4']) {
      const r = s.run(seq);
      assert.equal(r.status, 1, seq);
      assert.match(r.stderr, /highest counter already published under cdn-root is 5/);
    }
    assert.deepEqual(s.readMap(), before);
    // Another app version's map on the other platform at seq 9: a device keeps one counter for
    // every map, so this one must move past that too.
    const otherDir = join(s.root, 'cdn-root', 'android', 'maps', '1.0.0');
    mkdirSync(otherDir, { recursive: true });
    writeFileSync(join(otherDir, 'version-map.json'), JSON.stringify({ seq: 9, versions: VERSIONS, sig: 'x' }));
    assert.equal(highestPublishedSeq(s.root), 9);
    assert.match(s.run('6').stderr, /highest counter already published under cdn-root is 9/);
    assert.equal(s.run('10').status, 0);
    assert.equal(s.readMap().seq, 10);
  } finally {
    s.cleanup();
  }
});

test('refuses to run without a counter, and leaves the map alone', () => {
  const s = sandbox(VERSIONS);
  try {
    const r = spawnSync(process.execPath, [join(s.root, 'tools', 'sign-version-map.mjs'), 'ios', '2.0.0'], {
      encoding: 'utf8',
      env: { ...process.env, MF_RELEASE_SEQ: '' },
    });
    assert.equal(r.status, 1);
    assert.match(r.stderr, /MF_RELEASE_SEQ is not set/);
    assert.deepEqual(s.readMap(), VERSIONS);
  } finally {
    s.cleanup();
  }
});

test('refuses a file that is not a map of remotes to versions', () => {
  for (const bad of [[], {}, { listApp: 1 }, { seq: 1, versions: [], sig: 'x' }, { 'listApp@1.2.0,x': '1.0.0' }]) {
    const s = sandbox(bad);
    try {
      const r = s.run('1');
      assert.equal(r.status, 1, JSON.stringify(bad));
      assert.match(r.stderr, /cannot be signed/);
    } finally {
      s.cleanup();
    }
  }
});

test('names the usage and the missing map rather than failing somewhere else', () => {
  const s = sandbox(VERSIONS);
  try {
    assert.match(s.run('1', ['web', '2.0.0']).stderr, /Usage/);
    assert.match(s.run('1', ['ios']).stderr, /Usage/);
    const missing = s.run('1', ['ios', '9.9.9']);
    assert.equal(missing.status, 1);
    assert.match(missing.stderr, /No map at .*9\.9\.9/);
  } finally {
    s.cleanup();
  }
});
