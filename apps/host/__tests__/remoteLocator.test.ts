import {
  parseVersionMap,
  remoteManifestUrl,
  resolveRemoteLocator,
  type ResolveInput,
  versionMapUrl,
} from '../src/shell/remoteLocator';

// The resolver is the one piece of the operational layer that decides something on every single
// script the app loads, and on a device its answer is invisible: a wrong URL surfaces as a tab
// that will not open. Kept pure, it can be asked directly, which is what this file does.

const REMOTES = ['listApp', 'partyApp'] as const;

function input(over: Partial<ResolveInput> = {}): ResolveInput {
  return {
    scriptId: 'listApp',
    caller: undefined,
    remoteNames: REMOTES,
    mode: 'cdn',
    versions: { listApp: '1.2.0', partyApp: '1.0.0' },
    platform: 'ios',
    cdnBase: 'https://cdn.example.com',
    verify: 'strict',
    ...over,
  };
}

describe('resolveRemoteLocator', () => {
  // Deferring returns the dev servers' own resolution, which is the whole of development.
  test('defers in dev mode', () => {
    expect(resolveRemoteLocator(input({ mode: 'dev' }))).toBeUndefined();
  });

  // No map means no versions, so there is no URL this function could honestly produce.
  test('defers when the version map never resolved', () => {
    expect(resolveRemoteLocator(input({ mode: 'unresolved' }))).toBeUndefined();
  });

  test('sends a container to its own version directory, verified', () => {
    expect(resolveRemoteLocator(input({ scriptId: 'listApp' }))).toEqual({
      url: 'https://cdn.example.com/ios/listApp/1.2.0/listApp.container.js.bundle',
      cache: true,
      verifyScriptSignature: 'strict',
    });
  });

  // A chunk's id says nothing about which remote wants it. The caller does, and this is the case
  // that proves the resolver reads it rather than matching on the id.
  test('sends a chunk to the version directory of the remote that asked for it', () => {
    const locator = resolveRemoteLocator(
      input({ scriptId: '__federation_expose_ListStack', caller: 'listApp' }),
    );
    expect(locator?.url).toBe(
      'https://cdn.example.com/ios/listApp/1.2.0/__federation_expose_ListStack.chunk.bundle',
    );
  });

  // Two remotes on one CDN at once, each at the version the map named for it: the same launch
  // resolving different remotes to different versions is the point of a map with two lines.
  test('resolves each remote at its own version', () => {
    expect(resolveRemoteLocator(input({ scriptId: 'partyApp' }))?.url).toBe(
      'https://cdn.example.com/ios/partyApp/1.0.0/partyApp.container.js.bundle',
    );
  });

  test('defers for a script belonging to no known remote', () => {
    expect(
      resolveRemoteLocator(input({ scriptId: 'something.chunk', caller: 'somethingApp' })),
    ).toBeUndefined();
  });

  // A map that names one remote and not the other leaves the second with no version. Guessing
  // one would be worse than the failure: it would fetch code nobody pinned.
  test('defers for a remote the map said nothing about', () => {
    expect(
      resolveRemoteLocator(input({ scriptId: 'partyApp', versions: { listApp: '1.2.0' } })),
    ).toBeUndefined();
  });

  test('carries the verification mode it is given', () => {
    expect(resolveRemoteLocator(input({ verify: 'off' }))?.verifyScriptSignature).toBe('off');
  });

  test('builds android paths from the platform it is given', () => {
    expect(resolveRemoteLocator(input({ platform: 'android' }))?.url).toBe(
      'https://cdn.example.com/android/listApp/1.2.0/listApp.container.js.bundle',
    );
  });
});

describe('the URLs the launch is built from', () => {
  test('the version map is a file under the app version that asked for it', () => {
    expect(versionMapUrl('https://cdn.example.com', 'ios', '2.0.0')).toBe(
      'https://cdn.example.com/ios/maps/2.0.0/version-map.json',
    );
  });

  test('a remote is re-registered at the manifest inside its version directory', () => {
    expect(remoteManifestUrl('https://cdn.example.com', 'android', 'listApp', '1.1.0')).toBe(
      'https://cdn.example.com/android/listApp/1.1.0/mf-manifest.json',
    );
  });
});

describe('parseVersionMap', () => {
  test('reads a map of the remotes it knows', () => {
    expect(parseVersionMap({ listApp: '1.2.0', partyApp: '1.0.0' }, REMOTES)).toEqual({
      listApp: '1.2.0',
      partyApp: '1.0.0',
    });
  });

  // One CDN can serve more than one app, and a map may be written ahead of a host release. A
  // name this binary has never heard of is not a reason to refuse the ones it has.
  test('ignores remotes this binary does not have', () => {
    expect(parseVersionMap({ listApp: '1.2.0', mapsApp: '3.0.0' }, REMOTES)).toEqual({
      listApp: '1.2.0',
    });
  });

  test('accepts a prerelease version', () => {
    expect(parseVersionMap({ listApp: '2.0.0-rc.1' }, REMOTES)).toEqual({ listApp: '2.0.0-rc.1' });
  });

  // The rest is a stranger's JSON, and every one of these would otherwise reach the resolver as
  // a version and be pasted into a URL.
  test.each([
    ['not an object', 'listApp@1.2.0'],
    ['an array', [{ listApp: '1.2.0' }]],
    ['null', null],
    ['a version that is not a string', { listApp: 12 }],
    ['an empty version', { listApp: '' }],
    ['no known remote at all', { mapsApp: '3.0.0' }],
    ['nothing at all', {}],
  ])('refuses %s', (_case, raw) => {
    expect(parseVersionMap(raw, REMOTES)).toBeNull();
  });

  // A version becomes a path segment in a URL the app downloads code from, so a version that is
  // not shaped like one is refused before it can build a path nobody wrote. The traversal case is
  // the one that matters: with it accepted, a map could point a load anywhere on the origin.
  test.each([
    ['a path traversal', { listApp: '../../..' }],
    ['a slash', { listApp: '1.0.0/../2.0.0' }],
    ['a leading dot', { listApp: '.hidden' }],
    ['a percent escape', { listApp: '1.0.0%2f..' }],
    ['a space', { listApp: '1.0.0 ' }],
    ['a protocol-relative host', { listApp: '//evil.example.com' }],
    ['a newline', { listApp: '1.0.0\n' }],
    ['a version longer than any release name needs', { listApp: '1'.repeat(65) }],
  ])('refuses %s as a version', (_case, raw) => {
    expect(parseVersionMap(raw, REMOTES)).toBeNull();
  });

  test('accepts a version right up to the length bound', () => {
    const longest = `1${'0'.repeat(63)}`;
    expect(parseVersionMap({ listApp: longest }, REMOTES)).toEqual({ listApp: longest });
  });
});
