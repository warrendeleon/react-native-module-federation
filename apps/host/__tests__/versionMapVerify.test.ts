import { generateKeyPairSync, type KeyObject, sign } from 'node:crypto';

import { verifyVersionMap, versionMapSigningInput } from '../src/shell/versionMapVerify';

// The decision the launch makes about a fetched map, asked directly. The key is made here, for
// this run, so the test never touches the key in code-signing/; the map is signed with Node's own
// Ed25519 and verified by the host's pure-JavaScript path, the same split the publishing machine
// and the device have.

const { publicKey, privateKey } = generateKeyPairSync('ed25519');
const PUBLIC_KEY = (publicKey.export({ format: 'jwk' }) as { x: string }).x;

const VERSIONS = { listApp: '1.2.0', partyApp: '1.0.0' };

function signed(seq: number, versions: Record<string, string>, key: KeyObject = privateKey) {
  const sig = sign(null, Buffer.from(versionMapSigningInput(seq, versions)), key);
  return { seq, versions, sig: sig.toString('base64') };
}

test('the signing input is the counter, then the sorted name@version pairs', () => {
  const input = versionMapSigningInput(3, { partyApp: '1.0.0', listApp: '1.2.0' });
  expect(new TextDecoder().decode(input)).toBe('3|listApp@1.2.0,partyApp@1.0.0');
});

test('accepts a signed map whose counter is above the last one accepted', () => {
  expect(verifyVersionMap(signed(5, VERSIONS), PUBLIC_KEY, 3)).toEqual({
    ok: true,
    map: signed(5, VERSIONS),
  });
});

test('accepts the same counter again: a map fetched twice is not a replay', () => {
  expect(verifyVersionMap(signed(3, VERSIONS), PUBLIC_KEY, 3).ok).toBe(true);
});

test('accepts any counter on a device that has accepted none', () => {
  expect(verifyVersionMap(signed(1, VERSIONS), PUBLIC_KEY, 0).ok).toBe(true);
});

test('refuses a counter below the last one accepted', () => {
  expect(verifyVersionMap(signed(2, VERSIONS), PUBLIC_KEY, 3)).toEqual({
    ok: false,
    reason: 'release counter is older than the last one accepted',
  });
});

// The counter orders publishes, not versions.
test('accepts a higher counter that names older versions', () => {
  const rollback = signed(9, { ...VERSIONS, listApp: '1.1.0' });
  const result = verifyVersionMap(rollback, PUBLIC_KEY, 8);
  expect(result.ok).toBe(true);
  if (result.ok) {
    expect(result.map.versions.listApp).toBe('1.1.0');
  }
});

test('refuses a map edited after it was signed', () => {
  const edited = { ...signed(5, VERSIONS), versions: { ...VERSIONS, listApp: '9.9.9' } };
  expect(verifyVersionMap(edited, PUBLIC_KEY, 0)).toEqual({
    ok: false,
    reason: 'signature does not verify',
  });
});

test('refuses a map whose counter was edited after it was signed', () => {
  const edited = { ...signed(5, VERSIONS), seq: 6 };
  expect(verifyVersionMap(edited, PUBLIC_KEY, 0).ok).toBe(false);
});

test('refuses a map signed by another key', () => {
  const other = generateKeyPairSync('ed25519').privateKey;
  expect(verifyVersionMap(signed(5, VERSIONS, other), PUBLIC_KEY, 0)).toEqual({
    ok: false,
    reason: 'signature does not verify',
  });
});

test('refuses a signature that is not even the right length, without throwing', () => {
  expect(verifyVersionMap({ ...signed(5, VERSIONS), sig: 'bm90IGEgc2ln' }, PUBLIC_KEY, 0)).toEqual({
    ok: false,
    reason: 'signature does not verify',
  });
});

test.each([
  ['nothing', null, 'not an object'],
  ['a list', [], 'not an object'],
  ['the shape post 15 wrote', VERSIONS, 'no release counter'],
  ['a counter that is not a whole number', { seq: 1.5, versions: VERSIONS, sig: 'x' }, 'no release counter'],
  ['a negative counter', { seq: -1, versions: VERSIONS, sig: 'x' }, 'no release counter'],
  ['no versions', { seq: 1, sig: 'x' }, 'no versions'],
  ['versions that are not strings', { seq: 1, versions: { listApp: 1 }, sig: 'x' }, 'no versions'],
  ['no signature', { seq: 1, versions: VERSIONS }, 'no signature'],
  ['an empty signature', { seq: 1, versions: VERSIONS, sig: '' }, 'no signature'],
])('refuses %s with the reason named', (_case, raw, reason) => {
  expect(verifyVersionMap(raw, PUBLIC_KEY, 0)).toEqual({ ok: false, reason });
});

test('the shape is checked before the signature, so a malformed map never reaches the verifier', () => {
  // A map with no counter cannot be verified at all; the reason says what is missing, not that a
  // signature over nothing failed.
  expect(verifyVersionMap({ versions: VERSIONS, sig: signed(1, VERSIONS).sig }, PUBLIC_KEY, 0)).toEqual({
    ok: false,
    reason: 'no release counter',
  });
});
