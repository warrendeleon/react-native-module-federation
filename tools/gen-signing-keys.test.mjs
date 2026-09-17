// --- Regression tests for gen-signing-keys.mjs. Each case copies the script into a temporary
// tree (<tmp>/tools/gen-signing-keys.mjs, so its keyDir resolves to <tmp>/code-signing) and runs
// it as a child process, the way a reader does. Run: node --test tools/gen-signing-keys.test.mjs

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createPublicKey, generateKeyPairSync } from 'node:crypto';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const script = join(dirname(fileURLToPath(import.meta.url)), 'gen-signing-keys.mjs');

function sandbox() {
  const root = mkdtempSync(join(tmpdir(), 'gen-signing-keys-'));
  mkdirSync(join(root, 'tools'));
  cpSync(script, join(root, 'tools', 'gen-signing-keys.mjs'));
  const run = () => spawnSync(process.execPath, [join(root, 'tools', 'gen-signing-keys.mjs')], { encoding: 'utf8' });
  const priv = join(root, 'code-signing', 'private-key.pem');
  const pub = join(root, 'code-signing', 'public-key.pem');
  return { root, run, priv, pub, cleanup: () => rmSync(root, { recursive: true, force: true }) };
}

const mode = p => statSync(p).mode & 0o777;

test('a fresh run writes an owner-only private key and a matching public key', () => {
  const s = sandbox();
  try {
    const r = s.run();
    assert.equal(r.status, 0, r.stderr);
    assert.equal(mode(s.priv), 0o600);
    assert.match(readFileSync(s.pub, 'utf8'), /BEGIN PUBLIC KEY/);
  } finally {
    s.cleanup();
  }
});

test('a second run keeps the pair and tightens a widened private-key mode', () => {
  const s = sandbox();
  try {
    s.run();
    const before = readFileSync(s.priv, 'utf8');
    spawnSync('chmod', ['644', s.priv]);
    const r = s.run();
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /already present, kept/);
    assert.equal(readFileSync(s.priv, 'utf8'), before);
    assert.equal(mode(s.priv), 0o600);
  } finally {
    s.cleanup();
  }
});

test('a missing public key is derived from the private key', () => {
  const s = sandbox();
  try {
    s.run();
    const original = readFileSync(s.pub, 'utf8');
    rmSync(s.pub);
    const r = s.run();
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /derived from it/);
    assert.equal(readFileSync(s.pub, 'utf8'), original);
  } finally {
    s.cleanup();
  }
});

test('a public key with CRLF line endings still matches its private key', () => {
  const s = sandbox();
  try {
    s.run();
    const crlf = readFileSync(s.pub, 'utf8').replace(/\n/g, '\r\n');
    writeFileSync(s.pub, crlf);
    const r = s.run();
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /already present, kept/);
    assert.equal(readFileSync(s.pub, 'utf8'), crlf);
  } finally {
    s.cleanup();
  }
});

test('a public key from another pair stops the script and changes neither file', () => {
  const s = sandbox();
  try {
    s.run();
    const priv = readFileSync(s.priv, 'utf8');
    const other = generateKeyPairSync('rsa', { modulusLength: 2048 }).publicKey.export({ type: 'spki', format: 'pem' });
    writeFileSync(s.pub, other);
    const r = s.run();
    assert.equal(r.status, 1);
    assert.match(r.stderr, /does not match/);
    assert.equal(readFileSync(s.priv, 'utf8'), priv);
    assert.equal(readFileSync(s.pub, 'utf8'), other);
  } finally {
    s.cleanup();
  }
});

test('a public key on its own is never overwritten by a fresh pair', () => {
  const s = sandbox();
  try {
    s.run();
    const pub = readFileSync(s.pub, 'utf8');
    rmSync(s.priv);
    const r = s.run();
    assert.equal(r.status, 1);
    assert.match(r.stderr, /exists but .* does not/);
    assert.equal(readFileSync(s.pub, 'utf8'), pub);
    assert.equal(createPublicKey(pub).type, 'public');
    assert.throws(() => statSync(s.priv));
  } finally {
    s.cleanup();
  }
});
