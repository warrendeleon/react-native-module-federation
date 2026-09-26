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

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));

// The two files the script embeds into are copied from the repository rather than written as
// fixtures here, so these tests fail if the real Info.plist or strings.xml loses the entry the
// script looks for — which is the way that entry would actually go missing.
const PLIST = join('apps', 'host', 'ios', 'Host', 'Info.plist');
const STRINGS = join('apps', 'host', 'android', 'app', 'src', 'main', 'res', 'values', 'strings.xml');

function sandbox() {
  const root = mkdtempSync(join(tmpdir(), 'gen-signing-keys-'));
  mkdirSync(join(root, 'tools'));
  cpSync(script, join(root, 'tools', 'gen-signing-keys.mjs'));
  for (const rel of [PLIST, STRINGS]) {
    mkdirSync(join(root, dirname(rel)), { recursive: true });
    cpSync(join(repoRoot, rel), join(root, rel));
  }
  const run = () => spawnSync(process.execPath, [join(root, 'tools', 'gen-signing-keys.mjs')], { encoding: 'utf8' });
  const priv = join(root, 'code-signing', 'private-key.pem');
  const pub = join(root, 'code-signing', 'public-key.pem');
  const read = rel => readFileSync(join(root, rel), 'utf8');
  return { root, run, priv, pub, read, cleanup: () => rmSync(root, { recursive: true, force: true }) };
}

/** The value of a native file's RepackPublicKey entry, or undefined if the entry is gone. */
function embeddedKey(contents, pattern) {
  return pattern.exec(contents)?.[1];
}

const PLIST_KEY = /<key>RepackPublicKey<\/key>\s*<string>([\s\S]*?)<\/string>/;
const STRINGS_KEY = /<string name="RepackPublicKey">([\s\S]*?)<\/string>/;

/** The base64 body of a PEM public key, on one line: the shape Android's verifier decodes. */
const base64Body = pem =>
  pem
    .trim()
    .split('\n')
    .filter(line => !line.includes('PUBLIC KEY'))
    .join('');

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

test('a CRLF public key still embeds as one clean line for Android', () => {
  const s = sandbox();
  try {
    s.run();
    // The key file rewritten the way a Windows editor or a copy through a tool would leave it.
    writeFileSync(s.pub, readFileSync(s.pub, 'utf8').replace(/\n/g, '\r\n'));
    const r = s.run();
    assert.equal(r.status, 0, r.stderr);

    // Both verifiers would skip a stray carriage return (each decoder ignores it), so what this
    // pins is the generator's own promise: a CRLF key file embeds exactly what an LF one does.
    const android = embeddedKey(s.read(STRINGS), STRINGS_KEY);
    assert.ok(!/\s/.test(android), 'the Android value must carry no whitespace');
    assert.equal(android, base64Body(readFileSync(s.pub, 'utf8').replace(/\r\n/g, '\n')));

    // And the iOS value is PEM with plain newlines, not the file's own endings.
    assert.ok(!embeddedKey(s.read(PLIST), PLIST_KEY).includes('\r'), 'the plist must carry no CR');
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

test('the public key is embedded where each platform reads it', () => {
  const s = sandbox();
  try {
    const r = s.run();
    assert.equal(r.status, 0, r.stderr);
    const pem = readFileSync(s.pub, 'utf8').trim();

    // iOS parses PEM, so the whole file goes in, header and footer included.
    assert.equal(embeddedKey(s.read(PLIST), PLIST_KEY), pem);

    // Android strips the header and footer and decodes what is left without removing line
    // breaks, so a wrapped key would reach the decoder with newlines still in it.
    const android = embeddedKey(s.read(STRINGS), STRINGS_KEY);
    assert.equal(android, base64Body(pem));
    assert.ok(!android.includes('\n'), 'the Android value must be one line');
  } finally {
    s.cleanup();
  }
});

test('a second run rewrites the same key rather than appending to it', () => {
  const s = sandbox();
  try {
    s.run();
    const first = s.read(PLIST);
    const r = s.run();
    assert.equal(r.status, 0, r.stderr);
    assert.equal(s.read(PLIST), first);
  } finally {
    s.cleanup();
  }
});

test('a native file with no RepackPublicKey entry fails loudly instead of silently', () => {
  const s = sandbox();
  try {
    // The entry deleted, the way an Info.plist regenerated by Xcode would lose it.
    writeFileSync(join(s.root, PLIST), s.read(PLIST).replace(PLIST_KEY, ''));
    const r = s.run();
    assert.equal(r.status, 1);
    assert.match(r.stderr, /no RepackPublicKey entry in ios\/Host\/Info\.plist/);
    // The keys are still written and the other platform is still embedded: the failure is about
    // one file, and re-running after fixing it must not need the key regenerated.
    assert.match(readFileSync(s.pub, 'utf8'), /BEGIN PUBLIC KEY/);
    assert.equal(embeddedKey(s.read(STRINGS), STRINGS_KEY), base64Body(readFileSync(s.pub, 'utf8')));
  } finally {
    s.cleanup();
  }
});

test('an embedded key that no longer matches the private key is replaced', () => {
  const s = sandbox();
  try {
    s.run();
    // A key from somewhere else, as a rotation done by hand in the plist would leave it.
    const stale = generateKeyPairSync('rsa', { modulusLength: 2048 }).publicKey.export({ type: 'spki', format: 'pem' }).trim();
    writeFileSync(join(s.root, PLIST), s.read(PLIST).replace(PLIST_KEY, `<key>RepackPublicKey</key>\n\t<string>${stale}</string>`));
    const r = s.run();
    assert.equal(r.status, 0, r.stderr);
    assert.equal(embeddedKey(s.read(PLIST), PLIST_KEY), readFileSync(s.pub, 'utf8').trim());
  } finally {
    s.cleanup();
  }
});
