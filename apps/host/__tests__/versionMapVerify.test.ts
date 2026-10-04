import { generateKeyPairSync, type KeyObject, sign } from 'node:crypto';

import * as ed from '@noble/ed25519';

import {
  type MapIdentity,
  verifyVersionMap,
  versionMapSigningInput,
} from '../src/shell/versionMapVerify';

// The decision the launch makes about a fetched map, asked directly. The key is made here, for
// this run, so the test never touches the key in code-signing/; the map is signed with Node's own
// Ed25519 and verified by the host's pure-JavaScript path, the same split the publishing machine
// and the device have.

const { publicKey, privateKey } = generateKeyPairSync('ed25519');
const PUBLIC_KEY = (publicKey.export({ format: 'jwk' }) as { x: string }).x;

const VERSIONS = { listApp: '1.2.0', partyApp: '1.0.0' };
// The binary that fetches the map: the string is bound to it.
const THIS_APP: MapIdentity = { platform: 'ios', appVersion: '2.0.0' };

function signed(
  seq: number,
  versions: Record<string, string>,
  key: KeyObject = privateKey,
  identity: MapIdentity = THIS_APP,
) {
  const sig = sign(null, Buffer.from(versionMapSigningInput(identity, seq, versions)), key);
  return { seq, versions, sig: sig.toString('base64') };
}

const verify = (raw: unknown, highest = 0) => verifyVersionMap(raw, PUBLIC_KEY, THIS_APP, highest);

test('the signing input is the platform, the app version, the counter, then the sorted pairs', () => {
  const input = versionMapSigningInput(THIS_APP, 3, { partyApp: '1.0.0', listApp: '1.2.0' });
  expect(new TextDecoder().decode(input)).toBe('ios|2.0.0|3|listApp@1.2.0,partyApp@1.0.0');
});

test('accepts a signed map whose counter is above the last one accepted', () => {
  expect(verify(signed(5, VERSIONS), 3)).toEqual({ ok: true, map: signed(5, VERSIONS) });
});

test('accepts the same counter again: a map fetched twice is not a replay', () => {
  expect(verify(signed(3, VERSIONS), 3).ok).toBe(true);
});

test('accepts any counter on a device that has accepted none', () => {
  expect(verify(signed(1, VERSIONS), 0).ok).toBe(true);
});

test('refuses a counter below the last one accepted', () => {
  expect(verify(signed(2, VERSIONS), 3)).toEqual({
    ok: false,
    reason: 'release counter is older than the last one accepted',
  });
});

// The counter orders publishes, not versions.
test('accepts a higher counter that names older versions', () => {
  const result = verify(signed(9, { ...VERSIONS, listApp: '1.1.0' }), 8);
  expect(result.ok).toBe(true);
  if (result.ok) {
    expect(result.map.versions.listApp).toBe('1.1.0');
  }
});

test('refuses a map edited after it was signed', () => {
  const edited = { ...signed(5, VERSIONS), versions: { ...VERSIONS, listApp: '9.9.9' } };
  expect(verify(edited)).toEqual({ ok: false, reason: 'signature does not verify' });
});

test('refuses a map whose counter was edited after it was signed', () => {
  expect(verify({ ...signed(5, VERSIONS), seq: 6 }).ok).toBe(false);
});

test('refuses a map signed by another key', () => {
  const other = generateKeyPairSync('ed25519').privateKey;
  expect(verify(signed(5, VERSIONS, other))).toEqual({
    ok: false,
    reason: 'signature does not verify',
  });
});

// The CDN holds one map per app version per platform, all signed with the same key. A map moved to
// another binary's URL carries a valid signature over the wrong binary.
test.each([
  ['another app version', { platform: 'ios', appVersion: '1.0.0' }],
  ['the other platform', { platform: 'android', appVersion: '2.0.0' }],
])('refuses the map signed for %s, however valid its signature there', (_case, identity) => {
  const theirs = signed(5, { ...VERSIONS, listApp: '1.0.0' }, privateKey, identity);
  expect(verify(theirs)).toEqual({ ok: false, reason: 'signature does not verify' });
  expect(verifyVersionMap(theirs, PUBLIC_KEY, identity, 0).ok).toBe(true);
});

// A name holding the string's separators could make two different maps sign to the same bytes:
// {listApp, otherApp, partyApp} and {"listApp@1.2.0,otherApp": "3.0.0", partyApp} build the same
// string. Such names are refused before the signature is looked at, on both sides.
test('refuses a remote name or version the signing string cannot carry', () => {
  const wide = signed(7, { ...VERSIONS, otherApp: '3.0.0' });
  const moved = { ...wide, versions: { 'listApp@1.2.0,otherApp': '3.0.0', partyApp: '1.0.0' } };
  expect(verify(moved)).toEqual({ ok: false, reason: 'a remote name or version is not allowed' });
  for (const versions of [
    { 'list,App': '1.0.0' },
    { '1listApp': '1.0.0' },
    { listApp: '1.0.0|x' },
    { listApp: '../../..' },
    { listApp: '' },
  ]) {
    expect(verify({ ...signed(1, VERSIONS), versions })).toEqual({
      ok: false,
      reason: 'a remote name or version is not allowed',
    });
  }
});

test('refuses a signature that is not even the right length, without throwing', () => {
  expect(verify({ ...signed(5, VERSIONS), sig: 'bm90IGEgc2ln' })).toEqual({
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
  ['versions that are not strings', { seq: 1, versions: { listApp: 1 }, sig: 'x' }, 'a remote name or version is not allowed'],
  ['no signature', { seq: 1, versions: VERSIONS }, 'no signature'],
  ['an empty signature', { seq: 1, versions: VERSIONS, sig: '' }, 'no signature'],
])('refuses %s with the reason named', (_case, raw, reason) => {
  expect(verify(raw)).toEqual({ ok: false, reason });
});

test('a malformed map is refused on its shape and never reaches the verifier', () => {
  const verifier = jest.spyOn(ed, 'verify');
  expect(verify({ versions: VERSIONS, sig: signed(1, VERSIONS).sig })).toEqual({
    ok: false,
    reason: 'no release counter',
  });
  expect(verify({ ...signed(1, VERSIONS), versions: { 'a,b': '1.0.0' } }).ok).toBe(false);
  expect(verifier).not.toHaveBeenCalled();
  verifier.mockRestore();
});
