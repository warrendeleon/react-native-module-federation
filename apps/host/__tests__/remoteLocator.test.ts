import {
  embeddedManifestUrl,
  manifestRemote,
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
    bundledVersions: { listApp: '1.1.0', partyApp: '1.0.0' },
    fallbackRemotes: new Set<string>(),
    embeddedRoot: '/data/Host.app',
    platform: 'ios',
    cdnBase: 'https://cdn.example.com',
    verify: 'strict',
    ...over,
  };
}

// The URL a script resolves to, for the cases that should locate one.
function located(over: Partial<ResolveInput> = {}) {
  const resolution = resolveRemoteLocator(input(over));
  if (resolution.kind !== 'locate') {
    throw new Error(`expected a locator, got ${JSON.stringify(resolution)}`);
  }
  return resolution.locator;
}

describe('resolveRemoteLocator', () => {
  // Deferring returns the dev servers' own resolution, which is the whole of development.
  test('defers in dev mode', () => {
    expect(resolveRemoteLocator(input({ mode: 'dev' }))).toEqual({
      kind: 'defer',
    });
  });

  // No map means no versions. Deferring here would hand the remote to Re.Pack's own resolver,
  // which loads it from the unversioned build-time URL with no signature check, so it is refused.
  test('refuses a remote when the version map never resolved', () => {
    expect(resolveRemoteLocator(input({ mode: 'unresolved' })).kind).toBe(
      'refuse',
    );
    expect(
      resolveRemoteLocator(
        input({
          mode: 'unresolved',
          scriptId: '__federation_expose_ListStack',
          caller: 'listApp',
        }),
      ).kind,
    ).toBe('refuse');
  });

  test('sends a container to its own version directory, verified', () => {
    expect(resolveRemoteLocator(input({ scriptId: 'listApp' }))).toEqual({
      kind: 'locate',
      locator: {
        url: 'https://cdn.example.com/ios/listApp/1.2.0/listApp.container.js.bundle',
        cache: true,
        verifyScriptSignature: 'strict',
      },
    });
  });

  // A chunk's id says nothing about which remote wants it. The caller does, and this is the case
  // that proves the resolver reads it rather than matching on the id.
  test('sends a chunk to the version directory of the remote that asked for it', () => {
    expect(
      located({ scriptId: '__federation_expose_ListStack', caller: 'listApp' })
        .url,
    ).toBe(
      'https://cdn.example.com/ios/listApp/1.2.0/__federation_expose_ListStack.chunk.bundle',
    );
  });

  // Two remotes on one CDN at once, each at the version the map named for it: the same launch
  // resolving different remotes to different versions is the point of a map with two lines.
  test('resolves each remote at its own version', () => {
    expect(located({ scriptId: 'partyApp' }).url).toBe(
      'https://cdn.example.com/ios/partyApp/1.0.0/partyApp.container.js.bundle',
    );
  });

  // Anything that is not one of this host's remotes keeps Re.Pack's own resolution, in every mode.
  test.each(['cdn', 'unresolved'] as const)(
    'defers for a script belonging to no known remote in %s mode',
    mode => {
      expect(
        resolveRemoteLocator(
          input({ mode, scriptId: 'something.chunk', caller: 'somethingApp' }),
        ),
      ).toEqual({ kind: 'defer' });
    },
  );

  // A map that names one remote and not the other leaves the second with no version. Guessing one
  // would fetch code nobody pinned, and deferring would fetch it unverified, so it is refused, for
  // the container and for every chunk it would ask for.
  test('refuses a remote the map said nothing about', () => {
    const versions = { listApp: '1.2.0' };
    expect(
      resolveRemoteLocator(input({ scriptId: 'partyApp', versions })),
    ).toEqual({
      kind: 'refuse',
      reason: 'the version map named no version for partyApp',
    });
    expect(
      resolveRemoteLocator(
        input({
          scriptId: '__federation_expose_PartyStack',
          caller: 'partyApp',
          versions,
        }),
      ).kind,
    ).toBe('refuse');
  });

  test('carries the verification mode it is given', () => {
    expect(located({ verify: 'off' }).verifyScriptSignature).toBe('off');
  });

  test('builds android paths from the platform it is given', () => {
    expect(located({ platform: 'android' }).url).toBe(
      'https://cdn.example.com/android/listApp/1.2.0/listApp.container.js.bundle',
    );
  });
});

describe('the copy in the binary', () => {
  // Bundled mode is the launch that never reached the CDN: every remote comes off the disk, at the
  // version baked in, as an absolute file:// path, still verified.
  test('sends a container to its baked-in version directory, absolute and verified', () => {
    expect(resolveRemoteLocator(input({ mode: 'bundled' }))).toEqual({
      kind: 'locate',
      locator: {
        url: 'file:///data/Host.app/cdn/ios/listApp/1.1.0/listApp.container.js.bundle',
        cache: true,
        absolute: true,
        verifyScriptSignature: 'strict',
      },
    });
  });

  test('sends a chunk to the baked-in directory of the remote that asked for it', () => {
    expect(
      located({
        mode: 'bundled',
        scriptId: '__federation_expose_ListStack',
        caller: 'listApp',
      }).url,
    ).toBe(
      'file:///data/Host.app/cdn/ios/listApp/1.1.0/__federation_expose_ListStack.chunk.bundle',
    );
  });

  // The per-remote fallback: one remote failed from the CDN this session and runs from its copy,
  // while the other keeps the version the map named.
  test('a remote that fell back runs from its copy while the other stays on the CDN', () => {
    const fallbackRemotes = new Set(['listApp']);
    expect(located({ fallbackRemotes }).url).toBe(
      'file:///data/Host.app/cdn/ios/listApp/1.1.0/listApp.container.js.bundle',
    );
    expect(located({ fallbackRemotes, scriptId: 'partyApp' }).url).toBe(
      'https://cdn.example.com/ios/partyApp/1.0.0/partyApp.container.js.bundle',
    );
  });

  // The resolver is handed the live set, not a copy of it, so a remote that falls back after the
  // resolver was built is read on its very next script.
  test('reads the fallback set as it is now', () => {
    const fallbackRemotes = new Set<string>();
    const request = input({ fallbackRemotes });
    fallbackRemotes.add('listApp');
    expect(resolveRemoteLocator(request)).toMatchObject({
      kind: 'locate',
      locator: { absolute: true },
    });
  });

  // A binary built without a copy of a remote cannot serve it from the disk, and deferring would
  // load it from the placeholder URL unverified, so it is refused.
  test('refuses a remote the binary carries no copy of', () => {
    expect(
      resolveRemoteLocator(
        input({
          mode: 'bundled',
          scriptId: 'partyApp',
          bundledVersions: { listApp: '1.1.0' },
        }),
      ),
    ).toEqual({
      kind: 'refuse',
      reason: 'this binary carries no copy of partyApp',
    });
  });

  test('refuses when there is no directory to read the copy from', () => {
    expect(
      resolveRemoteLocator(input({ mode: 'bundled', embeddedRoot: undefined }))
        .kind,
    ).toBe('refuse');
  });

  test('builds android paths from the extracted directory it is given', () => {
    expect(
      located({
        mode: 'bundled',
        platform: 'android',
        embeddedRoot: '/data/user/0/com.host/files',
      }).url,
    ).toBe(
      'file:///data/user/0/com.host/files/cdn/android/listApp/1.1.0/listApp.container.js.bundle',
    );
  });

  // The fallback set has no meaning in development, where the dev servers own every load.
  test('development ignores the fallback set', () => {
    expect(
      resolveRemoteLocator(
        input({ mode: 'dev', fallbackRemotes: new Set(['listApp']) }),
      ),
    ).toEqual({
      kind: 'defer',
    });
  });

  test('a script that belongs to no known remote is still deferred', () => {
    expect(
      resolveRemoteLocator(
        input({
          mode: 'bundled',
          scriptId: 'something.chunk',
          caller: 'somethingApp',
        }),
      ),
    ).toEqual({ kind: 'defer' });
  });
});

describe('the URLs the launch is built from', () => {
  test('the version map is a file under the app version that asked for it', () => {
    expect(versionMapUrl('https://cdn.example.com', 'ios', '2.0.0')).toBe(
      'https://cdn.example.com/ios/maps/2.0.0/version-map.json',
    );
  });

  test('a remote is re-registered at the manifest inside its version directory', () => {
    expect(
      remoteManifestUrl(
        'https://cdn.example.com',
        'android',
        'listApp',
        '1.1.0',
      ),
    ).toBe('https://cdn.example.com/android/listApp/1.1.0/mf-manifest.json');
  });

  test('a remote running from its copy is registered at a manifest path inside the binary', () => {
    expect(
      embeddedManifestUrl('/data/Host.app', 'ios', 'listApp', '1.1.0'),
    ).toBe('file:///data/Host.app/cdn/ios/listApp/1.1.0/mf-manifest.json');
  });
});

describe('manifestRemote', () => {
  test('names the remote a manifest belongs to, wherever it is registered', () => {
    expect(
      manifestRemote(
        'https://cdn.example.com/ios/listApp/1.2.0/mf-manifest.json',
        REMOTES,
      ),
    ).toBe('listApp');
    expect(
      manifestRemote(
        'https://cdn.example.com/ios/partyApp/mf-manifest.json',
        REMOTES,
      ),
    ).toBe('partyApp');
    expect(
      manifestRemote(
        'file:///data/Host.app/cdn/ios/listApp/1.1.0/mf-manifest.json',
        REMOTES,
      ),
    ).toBe('listApp');
  });

  test('ignores every other request', () => {
    expect(
      manifestRemote(
        'https://cdn.example.com/ios/maps/2.0.0/version-map.json',
        REMOTES,
      ),
    ).toBeUndefined();
    expect(
      manifestRemote(
        'https://cdn.example.com/ios/otherApp/1.0.0/mf-manifest.json',
        REMOTES,
      ),
    ).toBeUndefined();
    expect(
      manifestRemote(
        'https://cdn.example.com/ios/listApp/1.2.0/listApp.container.js.bundle',
        REMOTES,
      ),
    ).toBeUndefined();
  });
});

describe('parseVersionMap', () => {
  test('reads a map of the remotes it knows', () => {
    expect(
      parseVersionMap({ listApp: '1.2.0', partyApp: '1.0.0' }, REMOTES),
    ).toEqual({
      listApp: '1.2.0',
      partyApp: '1.0.0',
    });
  });

  // One CDN can serve more than one app, and a map may be written ahead of a host release. A
  // name this binary has never heard of is not a reason to refuse the ones it has.
  test('ignores remotes this binary does not have', () => {
    expect(
      parseVersionMap({ listApp: '1.2.0', mapsApp: '3.0.0' }, REMOTES),
    ).toEqual({
      listApp: '1.2.0',
    });
  });

  test('accepts a prerelease version', () => {
    expect(parseVersionMap({ listApp: '2.0.0-rc.1' }, REMOTES)).toEqual({
      listApp: '2.0.0-rc.1',
    });
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
    [
      'a version longer than any release name needs',
      { listApp: '1'.repeat(65) },
    ],
  ])('refuses %s as a version', (_case, raw) => {
    expect(parseVersionMap(raw, REMOTES)).toBeNull();
  });

  test('accepts a version right up to the length bound', () => {
    const longest = `1${'0'.repeat(63)}`;
    expect(parseVersionMap({ listApp: longest }, REMOTES)).toEqual({
      listApp: longest,
    });
  });
});
