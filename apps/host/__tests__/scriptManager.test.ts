// --- The two facts this module rests on, neither of which a type checker or a reading can
// confirm, and both of which fail silently on a device: the resolver has to be registered ahead
// of Re.Pack's own, and the re-registration has to be forced. And, from the fallback post on, what
// the host does when the CDN fails it: at launch, and one remote at a time mid-session.
//
// All of it is asked of the stand-ins the host installs for the Re.Pack client and the Module
// Federation runtime, which record what they were handed. Each case loads the module fresh, with
// the build-time literals defined first, because the module reads them once at import and holds
// its initialisation for the life of the process.
//
// Every map a launch is meant to accept is signed, with a key made for this test run and its
// public half handed to the host in place of the embedded one, because from the signing post on a
// map the host cannot verify is a map it refuses. The maps it refuses are served on purpose under
// "believing the map", and one under "the launch probe", where there is no copy to fall back to.
// The failure record is under "remembering failures".

import { generateKeyPairSync, sign } from 'node:crypto';

const { publicKey: TEST_PUBLIC_KEY, privateKey: TEST_PRIVATE_KEY } = generateKeyPairSync('ed25519');
const PUBLIC_KEY = (TEST_PUBLIC_KEY.export({ format: 'jwk' }) as { x: string }).x;

/**
 * A map as the publishing tools write it: the versions, the release counter, and the signature,
 * bound to the platform and app version it is published for. The tests model an iOS host at app
 * version 2.0.0 except where a test says otherwise.
 */
function signed(
  versions: Record<string, string>,
  seq = 1,
  privateKey = TEST_PRIVATE_KEY,
  identity = { platform: 'ios', appVersion: '2.0.0' },
) {
  const pairs = Object.keys(versions)
    .sort()
    .map(name => `${name}@${versions[name]}`)
    .join(',');
  const input = `${identity.platform}|${identity.appVersion}|${seq}|${pairs}`;
  const sig = sign(null, Buffer.from(input, 'utf8'), privateKey);
  return { seq, versions, sig: sig.toString('base64') };
}

// --- What the host remembers between launches, as a stand-in for the device's storage: a test
// that spans launches hands the same one to each load, and a test that does not gets a fresh one.
// ---
type Device = {
  getString: (key: string) => string | undefined;
  getNumber: (key: string) => number | undefined;
  set: (key: string, value: string | number | boolean) => void;
  remove: (key: string) => boolean;
  contains: (key: string) => boolean;
};

function freshDevice(): Device {
  const values = new Map<string, string | number | boolean>();
  return {
    getString: key => (typeof values.get(key) === 'string' ? (values.get(key) as string) : undefined),
    getNumber: key => (typeof values.get(key) === 'number' ? (values.get(key) as number) : undefined),
    set: (key, value) => {
      values.set(key, value);
    },
    remove: key => values.delete(key),
    contains: key => values.has(key),
  };
}

type Registration = { name: string; entry: string };
type Recorder = {
  loadRemote: (id: string, options?: { loadFactory?: boolean; from?: string }) => Promise<unknown>;
  __loads: string[];
  __resolvers: [unknown, { key?: string; priority?: number }][];
  __calls: { remotes: Registration[]; options?: { force?: boolean } }[];
  __plugins: {
    name: string;
    fetch?: (url: string) => Promise<Response> | undefined;
    onLoad?: (args: { exposeModuleFactory?: unknown }) => unknown;
  }[];
  __registered: Registration[];
};

const CDN_BASE = 'https://cdn.example.com';
// Where a release build's bundle sits on iOS, and so where the copies in the binary sit.
const APP_PATH = '/data/Host.app';

// The copies a test build carries: which version of each remote, and the manifest that version's
// directory holds on the disk. A test that needs a binary with no copy of a remote leaves it out.
const COPIES = {
  versions: { listApp: '1.1.0', partyApp: '1.0.0' },
  manifests: {
    listApp: { id: 'listApp', name: 'listApp', metaData: {}, exposes: [], shared: [] },
    partyApp: { id: 'partyApp', name: 'partyApp', metaData: {}, exposes: [], shared: [] },
  },
};

interface Build {
  /** The file:// URL a release build's JavaScript bundle loads from; none in a development build. */
  scriptURL?: string;
  copies?: { versions: Record<string, string> };
  /** The device's storage, to carry between launches; a fresh one when left out. */
  device?: Device;
}

function loadFederation(cdnBase: string, appVersion: string, build: Build = {}) {
  const globals = globalThis as unknown as Record<string, unknown>;
  globals.__MF_CDN_BASE__ = cdnBase;
  globals.__APP_VERSION__ = appVersion;
  const copies = build.copies ?? { versions: {} };

  let loaded!: typeof import('../src/shell/scriptManager');
  let repack!: Recorder;
  let runtime!: Recorder;
  jest.isolateModules(() => {
    const { NativeModules } = require('react-native');
    NativeModules.SourceCode = { scriptURL: build.scriptURL };
    jest.doMock('../src/shell/embedded-versions', () => ({
      BUNDLED_VERSIONS: { ios: copies.versions },
    }));
    jest.doMock('../src/shell/version-map-public-key', () => ({
      VERSION_MAP_PUBLIC_KEY: PUBLIC_KEY,
    }));
    const device = build.device ?? freshDevice();
    jest.doMock('../src/shell/storage', () => ({
      ...jest.requireActual('../src/shell/storage'),
      storage: device,
    }));
    repack = require('@callstack/repack/client') as unknown as Recorder;
    runtime = require('@module-federation/runtime') as unknown as Recorder;
    loaded = require('../src/shell/scriptManager');
  });
  return { ...loaded, repack, runtime };
}

// A release build on iOS, carrying a copy of both remotes.
const RELEASE_WITH_COPIES: Build = { scriptURL: `file://${APP_PATH}/main.jsbundle`, copies: COPIES };

function respondWith(body: unknown, ok = true, status = 200) {
  globalThis.fetch = jest.fn().mockResolvedValue({
    ok,
    status,
    json: async () => body,
  }) as unknown as typeof fetch;
}

const cdnManifest = (remote: string, version: string) =>
  `${CDN_BASE}/ios/${remote}/${version}/mf-manifest.json`;
const embeddedManifest = (remote: string, version: string) =>
  `file://${APP_PATH}/cdn/ios/${remote}/${version}/mf-manifest.json`;

// What fetch finds on the disk of a release build carrying COPIES: each copy's manifest, beside its
// bundles.
const DISK = {
  [embeddedManifest('listApp', '1.1.0')]: COPIES.manifests.listApp,
  [embeddedManifest('partyApp', '1.0.0')]: COPIES.manifests.partyApp,
};

// The CDN as a set of paths: the map for the launch, and whatever manifests a test serves, with the
// copies' manifests on the disk beside it. Any other path is a 404, which is also what a retired
// version looks like.
function serveCdn(map: unknown, manifests: Record<string, unknown> = {}) {
  const files: Record<string, unknown> = { ...DISK, ...manifests };
  globalThis.fetch = jest.fn(async (url: string) => {
    if (url.endsWith('/version-map.json')) {
      return { ok: true, status: 200, json: async () => map };
    }
    if (url in files) {
      return new Response(JSON.stringify(files[url]), { status: 200 });
    }
    return { ok: false, status: 404, json: async () => ({}) };
  }) as unknown as typeof fetch;
}
const theFetchHook = (runtime: Recorder) =>
  runtime.__plugins.find(plugin => plugin.name === 'embedded-fallback')!.fetch!;

beforeEach(() => {
  // Some failure cases in this file warn on purpose. Silenced so a run that passes prints nothing,
  // and spied so the cases that end unresolved can check that their warning was logged.
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  const globals = globalThis as unknown as Record<string, unknown>;
  delete globals.__MF_CDN_BASE__;
  delete globals.__APP_VERSION__;
  delete globals.rspackChunkListApp;
  delete globals.rspackChunkPartyApp;
  jest.restoreAllMocks();
});

describe('the resolver the host installs', () => {
  // Re.Pack registers a resolver per remote at its default priority of 2. Once the launch has
  // re-registered the remotes it resolves to the right versioned URL, with no signature
  // verification on its locator. At 2 the winner depends on registration order, and below it this
  // one always loses, quietly: the app runs the right versions, unverified.
  test('outranks the one Re.Pack registers per remote', () => {
    const { repack } = loadFederation(CDN_BASE, '2.0.0');
    const [[, options]] = repack.__resolvers;
    expect(options.priority).toBeGreaterThan(2);
    expect(options.key).toBe('__signed_resolver__');
  });
});

// --- The registered resolver itself, as Re.Pack will call it. Refusing has to throw rather than
// return nothing: Re.Pack's resolveScript asks the next resolver whenever one returns nothing, and
// the next one for a remote is Re.Pack's own, which would load it from an unversioned URL with no
// signature check. It stops at the first resolver that throws. ---
type Resolver = (scriptId: string, caller?: string) => Promise<unknown>;
const theResolver = (repack: Recorder) => repack.__resolvers[0][0] as Resolver;

describe('what the resolver answers after the launch', () => {
  test('locates a mapped remote, verified, and refuses one the map did not name', async () => {
    respondWith(signed({ listApp: '1.2.0' }));
    const { initializeFederation, repack } = loadFederation(CDN_BASE, '2.0.0');
    await initializeFederation();
    const resolve = theResolver(repack);

    await expect(resolve('listApp')).resolves.toEqual({
      url: `${CDN_BASE}/ios/listApp/1.2.0/listApp.container.js.bundle`,
      cache: true,
      verifyScriptSignature: 'strict',
    });
    await expect(resolve('partyApp')).rejects.toThrow('refused partyApp');
    await expect(resolve('__federation_expose_PartyStack', 'partyApp')).rejects.toThrow(
      'refused __federation_expose_PartyStack',
    );
    // Not one of this host's remotes: Re.Pack's own resolution still applies.
    await expect(resolve('something.chunk', 'somethingApp')).resolves.toBeUndefined();
  });

  test('refuses every remote when the version map could not be read', async () => {
    respondWith({}, false, 404);
    const { initializeFederation, repack } = loadFederation(CDN_BASE, '2.0.0');
    await initializeFederation();
    const resolve = theResolver(repack);

    await expect(resolve('listApp')).rejects.toThrow('refused listApp');
    await expect(resolve('partyApp')).rejects.toThrow('refused partyApp');
  });

  test('defers everything to the dev servers when no CDN was configured', async () => {
    const { initializeFederation, repack } = loadFederation('', '2.0.0');
    await initializeFederation();
    await expect(theResolver(repack)('listApp')).resolves.toBeUndefined();
  });
});

describe('the launch probe', () => {
  test('re-registers every mapped remote at its versioned manifest, with force', async () => {
    respondWith(signed({ listApp: '1.2.0', partyApp: '1.0.0' }));
    const { initializeFederation, runtime } = loadFederation(CDN_BASE, '2.0.0');

    const status = await initializeFederation();
    expect(status.mode).toBe('cdn');
    expect(status.versions).toEqual({ listApp: '1.2.0', partyApp: '1.0.0' });

    const [call] = runtime.__calls;
    // Without force, registerRemotes finds each name already registered from the build-time map
    // and returns without doing anything or saying so.
    expect(call.options).toEqual({ force: true });
    expect(call.remotes).toEqual([
      { name: 'listApp', entry: `${CDN_BASE}/ios/listApp/1.2.0/mf-manifest.json` },
      { name: 'partyApp', entry: `${CDN_BASE}/ios/partyApp/1.0.0/mf-manifest.json` },
    ]);
  });

  test('asks for the map written for this binary, and asks for it uncached', async () => {
    respondWith(
      signed({ listApp: '1.0.0', partyApp: '1.0.0' }, 1, TEST_PRIVATE_KEY, {
        platform: 'ios',
        appVersion: '1.0.0',
      }),
    );
    const { initializeFederation } = loadFederation(CDN_BASE, '1.0.0');
    await initializeFederation();

    expect(globalThis.fetch).toHaveBeenCalledWith(
      `${CDN_BASE}/ios/maps/1.0.0/version-map.json`,
      expect.objectContaining({ headers: { 'cache-control': 'no-cache' } }),
    );
  });

  // The map is the one file that decides what runs, so a failure to read it must not leave the
  // app claiming a CDN launch it never had.
  test.each([
    ['the map is missing', () => respondWith({}, false, 404)],
    ['the map names a version that cannot go in a URL', () => respondWith(signed({ listApp: '../../..' }))],
    ['the CDN is unreachable', () => {
      globalThis.fetch = jest.fn().mockRejectedValue(new Error('offline')) as unknown as typeof fetch;
    }],
  ])('reports unresolved and registers nothing when %s and there is no copy', async (_case, arrange) => {
    arrange();
    const { initializeFederation, runtime } = loadFederation(CDN_BASE, '2.0.0');

    const status = await initializeFederation();
    expect(status.mode).toBe('unresolved');
    expect(status.versions).toEqual({});
    expect(runtime.__calls).toHaveLength(0);
    // A launch that cannot resolve says so in the log as well as on the banner: this is the one
    // state where the app looks fine and does nothing.
    expect(console.warn).toHaveBeenCalled();
  });

  test('stays on the dev servers when no CDN was configured', async () => {
    const { initializeFederation, runtime } = loadFederation('', '2.0.0');
    const status = await initializeFederation();
    expect(status.mode).toBe('dev');
    expect(runtime.__calls).toHaveLength(0);
  });
});

describe('the copy in the binary', () => {
  test('runs every remote from its copy when the map could not be read', async () => {
    respondWith({}, false, 404);
    const { initializeFederation, runtime, repack } = loadFederation(CDN_BASE, '2.0.0', RELEASE_WITH_COPIES);

    const status = await initializeFederation();
    expect(status).toEqual({
      mode: 'bundled',
      source: 'the copy in the binary',
      versions: { listApp: '1.1.0', partyApp: '1.0.0' },
      embedded: ['listApp', 'partyApp'],
      rolledBack: [],
    });
    // Registered at the manifests inside the binary, so the one place the runtime reads says where
    // the code now comes from.
    expect(runtime.__calls).toEqual([
      {
        remotes: [
          { name: 'listApp', entry: embeddedManifest('listApp', '1.1.0') },
          { name: 'partyApp', entry: embeddedManifest('partyApp', '1.0.0') },
        ],
        options: { force: true },
      },
    ]);
    // And every script resolves to the copy, as an absolute path, still verified.
    await expect(theResolver(repack)('listApp')).resolves.toEqual({
      url: `file://${APP_PATH}/cdn/ios/listApp/1.1.0/listApp.container.js.bundle`,
      cache: true,
      absolute: true,
      verifyScriptSignature: 'strict',
    });
  });

  test('runs only the remotes it carries a copy of', async () => {
    respondWith({}, false, 404);
    const { initializeFederation } = loadFederation(CDN_BASE, '2.0.0', {
      ...RELEASE_WITH_COPIES,
      copies: { versions: { listApp: '1.1.0' } },
    });
    const status = await initializeFederation();
    expect(status.mode).toBe('bundled');
    expect(status.embedded).toEqual(['listApp']);
  });

  // A map that arrives and reads is not yet a CDN launch: its versions still have to register.
  // When that fails the launch runs from the copies, and when the copies cannot be registered
  // either it ends unresolved, with the resolver naming that cause rather than a map never read.
  test('runs from the copies when the map read but its versions could not be registered', async () => {
    const device = freshDevice();
    device.set('mf.versionMap.seq', 4);
    respondWith(signed({ listApp: '1.2.0', partyApp: '1.0.0' }, 9));
    const { initializeFederation, runtime } = loadFederation(CDN_BASE, '2.0.0', {
      ...RELEASE_WITH_COPIES,
      device,
    });
    jest
      .spyOn(runtime as unknown as { registerRemotes: () => void }, 'registerRemotes')
      .mockImplementationOnce(() => {
        throw new Error('registration failed');
      });
    const status = await initializeFederation();
    expect(status.mode).toBe('bundled');
    expect(status.embedded).toEqual(['listApp', 'partyApp']);
    // The map was verified and read, and it was not the map this launch ran on: the counter it
    // carried is not remembered, so the device is left where it was.
    expect(device.getNumber('mf.versionMap.seq')).toBe(4);
  });

  test('ends unresolved when neither the versions nor the copies can be registered', async () => {
    respondWith(signed({ listApp: '1.2.0', partyApp: '1.0.0' }));
    const { initializeFederation, runtime, repack } = loadFederation(CDN_BASE, '2.0.0', RELEASE_WITH_COPIES);
    jest
      .spyOn(runtime as unknown as { registerRemotes: () => void }, 'registerRemotes')
      .mockImplementation(() => {
        throw new Error('registration failed');
      });
    const status = await initializeFederation();
    expect(status.mode).toBe('unresolved');
    await expect(theResolver(repack)('listApp')).rejects.toThrow(
      'this launch could use neither a version map nor a copy, so listApp has no version to load',
    );
  });

  // A development build loads its bundle from the dev server, so there is no .app directory to
  // derive and no copy to run, even when the binary was built with some.
  test('a build whose bundle came over http has no copy to run', async () => {
    respondWith({}, false, 404);
    const { initializeFederation } = loadFederation(CDN_BASE, '2.0.0', {
      scriptURL: 'http://localhost:8081/index.bundle?platform=ios',
      copies: COPIES,
    });
    const status = await initializeFederation();
    expect(status.mode).toBe('unresolved');
  });
});

describe('the manifest net', () => {
  // A bundled launch registered every remote at its copy's manifest, so the runtime's own fetch
  // reads it from the disk and the hook has nothing to add.
  test('leaves a bundled launch to the runtime', async () => {
    respondWith({}, false, 404);
    const { initializeFederation, runtime } = loadFederation(CDN_BASE, '2.0.0', RELEASE_WITH_COPIES);
    await initializeFederation();
    expect(theFetchHook(runtime)(embeddedManifest('listApp', '1.1.0'))).toBeUndefined();
  });

  test('hands a healthy CDN manifest through as it came', async () => {
    const manifest = { id: 'listApp', from: 'the CDN' };
    serveCdn(signed({ listApp: '1.2.0', partyApp: '1.0.0' }), { [cdnManifest('listApp', '1.2.0')]: manifest });
    const { initializeFederation, runtime, getFederationStatus } = loadFederation(
      CDN_BASE,
      '2.0.0',
      RELEASE_WITH_COPIES,
    );
    await initializeFederation();

    const response = await theFetchHook(runtime)(cdnManifest('listApp', '1.2.0'));
    await expect(response!.json()).resolves.toEqual(manifest);
    expect(getFederationStatus().embedded).toEqual([]);
  });

  // A retired version answers 404; a CDN that goes away mid-session does not answer at all. Either
  // way the one remote drops to its copy and the launch carries on around it.
  test.each([
    ['answers 404', () => serveCdn(signed({ listApp: '1.2.0', partyApp: '1.0.0' }))],
    [
      'cannot be reached',
      () => {
        serveCdn(signed({ listApp: '1.2.0', partyApp: '1.0.0' }));
        const cdn = globalThis.fetch as jest.Mock;
        const map = cdn.getMockImplementation()!;
        cdn.mockImplementation(async (url: string) => {
          if (url.startsWith(CDN_BASE) && url.endsWith('/mf-manifest.json')) {
            throw new TypeError('Network request failed');
          }
          return map(url);
        });
      },
    ],
  ])('drops one remote to its copy when its CDN manifest %s', async (_case, arrange) => {
    arrange();
    const { initializeFederation, runtime, repack, getFederationStatus } = loadFederation(
      CDN_BASE,
      '2.0.0',
      RELEASE_WITH_COPIES,
    );
    await initializeFederation();

    const response = await theFetchHook(runtime)(cdnManifest('listApp', '1.2.0'));
    await expect(response!.json()).resolves.toEqual(COPIES.manifests.listApp);
    // Read from the copy on the disk, not from anything compiled into the host.
    expect(globalThis.fetch).toHaveBeenLastCalledWith(embeddedManifest('listApp', '1.1.0'));

    expect(getFederationStatus()).toEqual({
      mode: 'cdn',
      source: CDN_BASE,
      versions: { listApp: '1.1.0', partyApp: '1.0.0' },
      embedded: ['listApp'],
      rolledBack: [],
    });
    // The fallen-back remote now resolves to its copy; the other one is still on the CDN.
    const resolve = theResolver(repack);
    await expect(resolve('__federation_expose_ListStack', 'listApp')).resolves.toMatchObject({
      url: `file://${APP_PATH}/cdn/ios/listApp/1.1.0/__federation_expose_ListStack.chunk.bundle`,
      absolute: true,
    });
    await expect(resolve('partyApp')).resolves.toMatchObject({
      url: `${CDN_BASE}/ios/partyApp/1.0.0/partyApp.container.js.bundle`,
    });
  });

  // Once a remote has fallen back, every later request for its manifest, at whatever URL it is
  // still registered, is answered from its copy: a reload must not send it back to the CDN.
  test('keeps a fallen-back remote on its copy\'s manifest', async () => {
    serveCdn(signed({ listApp: '1.2.0', partyApp: '1.0.0' }));
    const { initializeFederation, runtime } = loadFederation(CDN_BASE, '2.0.0', RELEASE_WITH_COPIES);
    await initializeFederation();
    const hook = theFetchHook(runtime);
    await hook(cdnManifest('listApp', '1.2.0'));
    const cdn = globalThis.fetch as jest.Mock;
    cdn.mockClear();

    const response = await hook(cdnManifest('listApp', '1.2.0'));
    await expect(response!.json()).resolves.toEqual(COPIES.manifests.listApp);
    expect(cdn.mock.calls).toEqual([[embeddedManifest('listApp', '1.1.0')]]);
  });

  test('leaves every other request to the runtime', async () => {
    serveCdn(signed({ listApp: '1.2.0', partyApp: '1.0.0' }));
    const { initializeFederation, runtime } = loadFederation(CDN_BASE, '2.0.0', {
      ...RELEASE_WITH_COPIES,
      copies: { versions: { listApp: '1.1.0' } },
    });
    await initializeFederation();
    const hook = theFetchHook(runtime);

    // Not a manifest, and a manifest of no remote this host knows.
    expect(hook(`${CDN_BASE}/ios/listApp/1.2.0/listApp.container.js.bundle`)).toBeUndefined();
    expect(hook(`${CDN_BASE}/ios/otherApp/1.0.0/mf-manifest.json`)).toBeUndefined();
    // A remote this binary carries no copy of: nothing to fall back to, so the runtime's own fetch.
    expect(hook(cdnManifest('partyApp', '1.0.0'))).toBeUndefined();
  });

  test('stays out of the way in dev mode', async () => {
    const { initializeFederation, runtime } = loadFederation('', '2.0.0', { copies: COPIES });
    await initializeFederation();
    expect(theFetchHook(runtime)('http://localhost:8082/ios/mf-manifest.json')).toBeUndefined();
  });
});

describe('reloading a remote', () => {
  async function cdnLaunch() {
    serveCdn(signed({ listApp: '1.2.0', partyApp: '1.0.0' }));
    const federation = loadFederation(CDN_BASE, '2.0.0', RELEASE_WITH_COPIES);
    await federation.initializeFederation();
    return federation;
  }

  test('a CDN remote can drop to its copy once, and only from the CDN', async () => {
    const { canFallBack, fallBackAndReload } = await cdnLaunch();
    expect(canFallBack('listApp')).toBe(true);
    fallBackAndReload('listApp');
    expect(canFallBack('listApp')).toBe(false);
    expect(canFallBack('partyApp')).toBe(true);

    respondWith({}, false, 404);
    const bundled = loadFederation(CDN_BASE, '2.0.0', RELEASE_WITH_COPIES);
    await bundled.initializeFederation();
    expect(bundled.canFallBack('listApp')).toBe(false);

    const dev = loadFederation('', '2.0.0', { copies: COPIES });
    await dev.initializeFederation();
    expect(dev.canFallBack('listApp')).toBe(false);
  });

  test('dropping to the copy re-registers the remote there and clears what it installed', async () => {
    const { fallBackAndReload, runtime, getFederationStatus, subscribeFederationStatus } =
      await cdnLaunch();
    const listener = jest.fn();
    subscribeFederationStatus(listener);
    const globals = globalThis as unknown as Record<string, unknown>;
    globals.rspackChunkListApp = [[['__federation_expose_ListStack'], {}]];
    globals.rspackChunkPartyApp = [[['__federation_expose_PartyStack'], {}]];

    fallBackAndReload('listApp');

    expect(runtime.__calls.at(-1)).toEqual({
      remotes: [{ name: 'listApp', entry: embeddedManifest('listApp', '1.1.0') }],
      options: { force: true },
    });
    expect(globals.rspackChunkListApp).toBeUndefined();
    // Dropping listApp to its copy leaves partyApp's chunk registry in place.
    expect(globals.rspackChunkPartyApp).toBeDefined();
    expect(getFederationStatus().embedded).toEqual(['listApp']);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  test('Try again re-registers a remote where it is registered now', async () => {
    const { forceReloadRemote, fallBackAndReload, runtime } = await cdnLaunch();
    const globals = globalThis as unknown as Record<string, unknown>;
    globals.rspackChunkPartyApp = [];

    forceReloadRemote('partyApp');
    expect(runtime.__calls.at(-1)).toEqual({
      remotes: [{ name: 'partyApp', entry: cdnManifest('partyApp', '1.0.0') }],
      options: { force: true },
    });
    expect(globals.rspackChunkPartyApp).toBeUndefined();

    // After a drop to the copy, where it is registered now is the copy.
    fallBackAndReload('listApp');
    forceReloadRemote('listApp');
    expect(runtime.__calls.at(-1)).toEqual({
      remotes: [{ name: 'listApp', entry: embeddedManifest('listApp', '1.1.0') }],
      options: { force: true },
    });
  });

  test('a name that is not one of this host\'s remotes is left alone', async () => {
    const { forceReloadRemote, fallBackAndReload, runtime } = await cdnLaunch();
    const before = runtime.__calls.length;
    forceReloadRemote('otherApp');
    fallBackAndReload('otherApp');
    expect(runtime.__calls).toHaveLength(before);
  });

  test('a listener stops hearing about changes once it unsubscribes', async () => {
    const { fallBackAndReload, subscribeFederationStatus } = await cdnLaunch();
    const listener = jest.fn();
    const unsubscribe = subscribeFederationStatus(listener);
    unsubscribe();
    fallBackAndReload('listApp');
    expect(listener).not.toHaveBeenCalled();
  });
});

describe('loading a remote module', () => {
  test('asks the runtime for the factory and evaluates it here', async () => {
    const { loadRemoteModule, runtime } = loadFederation('', '2.0.0');
    const loadRemote = jest.spyOn(runtime, 'loadRemote');
    await expect(loadRemoteModule('partyApp/styles')).resolves.toEqual({});
    expect(loadRemote).toHaveBeenCalledWith('partyApp/styles', { loadFactory: false, from: 'runtime' });
  });

  test('fails the load when the module throws as it is evaluated', async () => {
    const { loadRemoteModule, runtime } = loadFederation('', '2.0.0');
    jest.spyOn(runtime, 'loadRemote').mockResolvedValue(() => {
      throw new Error('PokedexScreen failed to initialise');
    });
    await expect(loadRemoteModule('listApp/ListStack')).rejects.toThrow(
      'PokedexScreen failed to initialise',
    );
  });

  test('settles with nothing when the runtime hands back nothing', async () => {
    const { loadRemoteModule, runtime } = loadFederation('', '2.0.0');
    jest.spyOn(runtime, 'loadRemote').mockResolvedValue(null);
    await expect(loadRemoteModule('listApp/ListStack')).resolves.toBeUndefined();
  });
});

// --- Every remote module the host loads is evaluated inside the error guard's window.
// loadRemoteModule asks the runtime for the module's factory unexecuted, with loadFactory: false,
// so the runtime hands that factory to the plugins' onLoad hook, and a function returned from the
// hook replaces it. The plugin is asked directly here, the way the runtime asks it. ---
describe('the evaluation window the host installs', () => {
  const theWindow = (runtime: Recorder) => {
    const plugin = runtime.__plugins.find(entry => entry.name === 'evaluation-window')!;
    return { onLoad: plugin.onLoad! };
  };

  test('wraps a module factory, and the wrapper hands back what the module exports', () => {
    const { runtime } = loadFederation(CDN_BASE, '2.0.0');
    const exports = { default: () => null };
    const wrapped = theWindow(runtime).onLoad({ exposeModuleFactory: () => exports });
    expect(typeof wrapped).toBe('function');
    expect((wrapped as () => unknown)()).toBe(exports);
  });

  test('fails the import when the module throws as it is evaluated', () => {
    const { runtime } = loadFederation(CDN_BASE, '2.0.0');
    const wrapped = theWindow(runtime).onLoad({
      exposeModuleFactory: () => {
        throw new Error('PokedexScreen failed to initialise');
      },
    }) as () => unknown;
    expect(wrapped).toThrow('PokedexScreen failed to initialise');
  });

  test('leaves a load that already has its exports alone', () => {
    const { runtime } = loadFederation(CDN_BASE, '2.0.0');
    expect(theWindow(runtime).onLoad({ exposeModuleFactory: undefined })).toBeUndefined();
  });
});

// --- Believing the map. The signature and the release counter are checked before the versions
// are read, the device remembers the highest counter it has accepted, and every refusal lands the
// launch on its copies with the reason in the log. ---
describe('believing the map', () => {
  const VERSIONS = { listApp: '1.2.0', partyApp: '1.0.0' };

  test('accepts a signed map and remembers its release counter', async () => {
    const device = freshDevice();
    respondWith(signed(VERSIONS, 7));
    const { initializeFederation } = loadFederation(CDN_BASE, '2.0.0', { ...RELEASE_WITH_COPIES, device });
    const status = await initializeFederation();
    expect(status.mode).toBe('cdn');
    expect(status.versions).toEqual(VERSIONS);
    expect(device.getNumber('mf.versionMap.seq')).toBe(7);
  });

  test.each([
    ['one version was edited after signing', () => ({ ...signed(VERSIONS), versions: { ...VERSIONS, listApp: '9.9.9' } }), 'signature does not verify'],
    ['it was signed by another key', () => signed(VERSIONS, 1, generateKeyPairSync('ed25519').privateKey), 'signature does not verify'],
    ['it carries no signature', () => ({ seq: 1, versions: VERSIONS }), 'no signature'],
    ['it carries no release counter', () => ({ versions: VERSIONS, sig: 'x' }), 'no release counter'],
    ['it is the shape post 15 wrote', () => VERSIONS, 'no release counter'],
  ])('runs from the copies when %s', async (_case, map, reason) => {
    const device = freshDevice();
    respondWith(map());
    const { initializeFederation } = loadFederation(CDN_BASE, '2.0.0', { ...RELEASE_WITH_COPIES, device });
    const status = await initializeFederation();
    expect(status.mode).toBe('bundled');
    expect(console.warn).toHaveBeenCalledWith(`[federation] version map refused: ${reason}`);
    // Nothing was accepted, so nothing was remembered.
    expect(device.getNumber('mf.versionMap.seq')).toBeUndefined();
  });

  test('refuses a map older than the last one accepted, and keeps what it remembered', async () => {
    const device = freshDevice();
    respondWith(signed(VERSIONS, 5));
    await loadFederation(CDN_BASE, '2.0.0', { ...RELEASE_WITH_COPIES, device }).initializeFederation();

    respondWith(signed({ ...VERSIONS, listApp: '1.1.0' }, 4));
    const status = await loadFederation(CDN_BASE, '2.0.0', { ...RELEASE_WITH_COPIES, device }).initializeFederation();
    expect(status.mode).toBe('bundled');
    expect(console.warn).toHaveBeenCalledWith(
      '[federation] version map refused: release counter is older than the last one accepted',
    );
    expect(device.getNumber('mf.versionMap.seq')).toBe(5);
  });

  test('accepts the same release counter again: a re-fetched map is not a replay', async () => {
    const device = freshDevice();
    respondWith(signed(VERSIONS, 5));
    await loadFederation(CDN_BASE, '2.0.0', { ...RELEASE_WITH_COPIES, device }).initializeFederation();
    const status = await loadFederation(CDN_BASE, '2.0.0', { ...RELEASE_WITH_COPIES, device }).initializeFederation();
    expect(status.mode).toBe('cdn');
    expect(device.getNumber('mf.versionMap.seq')).toBe(5);
  });

  // The counter orders publishes, not versions: a deliberate rollback is a newer publish that
  // names older versions, and the device takes it.
  test('accepts a higher counter that names older versions', async () => {
    const device = freshDevice();
    respondWith(signed(VERSIONS, 5));
    await loadFederation(CDN_BASE, '2.0.0', { ...RELEASE_WITH_COPIES, device }).initializeFederation();

    respondWith(signed({ ...VERSIONS, listApp: '1.1.0' }, 6));
    const status = await loadFederation(CDN_BASE, '2.0.0', { ...RELEASE_WITH_COPIES, device }).initializeFederation();
    expect(status.mode).toBe('cdn');
    expect(status.versions.listApp).toBe('1.1.0');
    expect(device.getNumber('mf.versionMap.seq')).toBe(6);
  });

  // The CDN holds one map per app version per platform, all signed with the same key. The map
  // written for another binary carries a valid signature over the wrong binary, and this one
  // refuses it as if it were forged.
  test.each([
    ['another app version', { platform: 'ios', appVersion: '1.0.0' }],
    ['the other platform', { platform: 'android', appVersion: '2.0.0' }],
  ])('runs from the copies when served the map signed for %s', async (_case, identity) => {
    const device = freshDevice();
    respondWith(signed({ ...VERSIONS, listApp: '1.0.0' }, 3, TEST_PRIVATE_KEY, identity));
    const status = await loadFederation(CDN_BASE, '2.0.0', { ...RELEASE_WITH_COPIES, device }).initializeFederation();
    expect(status.mode).toBe('bundled');
    expect(console.warn).toHaveBeenCalledWith('[federation] version map refused: signature does not verify');
    expect(device.getNumber('mf.versionMap.seq')).toBeUndefined();
  });

  // The device's storage is read behind a guard: a store that throws counts as a device that
  // remembers nothing, and the launch goes on rather than refusing every remote.
  test('a storage that throws is treated as remembering nothing, and the launch goes on', async () => {
    const broken: Device = {
      getString: () => {
        throw new Error('storage unavailable');
      },
      getNumber: () => {
        throw new Error('storage unavailable');
      },
      set: () => {
        throw new Error('storage unavailable');
      },
      remove: () => false,
      contains: () => false,
    };
    respondWith(signed(VERSIONS, 2));
    const federation = loadFederation(CDN_BASE, '2.0.0', { ...RELEASE_WITH_COPIES, device: broken });
    const status = await federation.initializeFederation();
    expect(status.mode).toBe('cdn');
    expect(status.rolledBack).toEqual([]);
    federation.fallBackAndReload('listApp');
    federation.markRemoteLoadSuccess('partyApp');
    expect(console.warn).toHaveBeenCalledWith(
      '[federation] the release counter could not be written',
      expect.any(Error),
    );
  });

  // The signature covers every remote the map names, this binary's or not; the host reads out its
  // own afterwards. A map that verifies and then names nothing this binary can run is refused as
  // unreadable, and the counter is not advanced for a map that was not used.
  test('reads only its own remotes out of a verified map, and remembers nothing from one it cannot read', async () => {
    const device = freshDevice();
    respondWith(signed({ ...VERSIONS, otherApp: '3.0.0' }, 2));
    const status = await loadFederation(CDN_BASE, '2.0.0', { ...RELEASE_WITH_COPIES, device }).initializeFederation();
    expect(status.versions).toEqual(VERSIONS);
    expect(device.getNumber('mf.versionMap.seq')).toBe(2);

    // A map that names none of this binary's remotes verifies and is then unreadable. A map that
    // names one of them at a version that cannot go in a URL is refused before the signature is
    // checked. Neither moves the counter.
    const unusableMaps: [Record<string, string>, string][] = [
      [{ otherApp: '3.0.0' }, '[federation] version map was served but could not be read'],
      [
        { listApp: '1.2.0', partyApp: '../../..' },
        '[federation] version map refused: a remote name or version is not allowed',
      ],
    ];
    for (const [versions, warning] of unusableMaps) {
      jest.mocked(console.warn).mockClear();
      const unreadable = freshDevice();
      respondWith(signed(versions, 3));
      const refused = await loadFederation(CDN_BASE, '2.0.0', { ...RELEASE_WITH_COPIES, device: unreadable }).initializeFederation();
      expect(refused.mode).toBe('bundled');
      expect(console.warn).toHaveBeenCalledWith(warning);
      expect(unreadable.getNumber('mf.versionMap.seq')).toBeUndefined();
    }
  });
});

// --- Remembering failures. A remote that drops to its copy counts one failed launch against the
// version the map named; at the threshold the next launch sends it to its copy before trying the
// CDN; a render of the CDN version clears the count, a render of the copy does not. ---
describe('remembering failures', () => {
  const VERSIONS = { listApp: '1.2.0', partyApp: '1.0.0' };
  const health = (device: Device, remote: string) => JSON.parse(device.getString(`mf.health.${remote}`) ?? 'null');

  async function cdnLaunch(device: Device) {
    serveCdn(signed(VERSIONS));
    const federation = loadFederation(CDN_BASE, '2.0.0', { ...RELEASE_WITH_COPIES, device });
    await federation.initializeFederation();
    return federation;
  }

  test('a remote that drops to its copy counts one failed launch of the version the map named', async () => {
    const device = freshDevice();
    const { fallBackAndReload } = await cdnLaunch(device);
    fallBackAndReload('listApp');
    expect(health(device, 'listApp')).toEqual({ version: '1.2.0', fails: 1 });
    expect(health(device, 'partyApp')).toBeNull();
    // Dropping again in the same session is the same failure, not a second launch.
    fallBackAndReload('listApp');
    expect(health(device, 'listApp')).toEqual({ version: '1.2.0', fails: 1 });
  });

  test('the manifest net counts a failure the same way', async () => {
    const device = freshDevice();
    const { runtime } = await cdnLaunch(device);
    await theFetchHook(runtime)(cdnManifest('listApp', '1.2.0'));
    expect(health(device, 'listApp')).toEqual({ version: '1.2.0', fails: 1 });
  });

  test('after two failed launches the third runs that remote from its copy without asking the CDN', async () => {
    const device = freshDevice();
    (await cdnLaunch(device)).fallBackAndReload('listApp');
    (await cdnLaunch(device)).fallBackAndReload('listApp');
    expect(health(device, 'listApp')).toEqual({ version: '1.2.0', fails: 2 });

    const { getFederationStatus, runtime, repack, canFallBack } = await cdnLaunch(device);
    expect(getFederationStatus()).toEqual({
      mode: 'cdn',
      source: CDN_BASE,
      versions: { listApp: '1.1.0', partyApp: '1.0.0' },
      embedded: ['listApp'],
      rolledBack: ['listApp'],
    });
    // Registered at the copy's manifest from the start, resolved to the copy, and nothing of
    // listApp was asked of the CDN.
    expect(runtime.__calls.at(-1)!.remotes).toEqual([
      { name: 'listApp', entry: embeddedManifest('listApp', '1.1.0') },
      { name: 'partyApp', entry: cdnManifest('partyApp', '1.0.0') },
    ]);
    await expect(theResolver(repack)('listApp')).resolves.toMatchObject({
      url: `file://${APP_PATH}/cdn/ios/listApp/1.1.0/listApp.container.js.bundle`,
    });
    const fetchMock = globalThis.fetch as jest.Mock;
    fetchMock.mockClear();
    await theFetchHook(runtime)(cdnManifest('listApp', '1.2.0'));
    const fetched = fetchMock.mock.calls.map(([url]) => url);
    expect(fetched).toContain(embeddedManifest('listApp', '1.1.0'));
    expect(fetched).not.toContain(cdnManifest('listApp', '1.2.0'));
    // It is already on its copy, so there is nowhere further to drop.
    expect(canFallBack('listApp')).toBe(false);
    expect(canFallBack('partyApp')).toBe(true);
  });

  test('a render of the CDN version clears the count', async () => {
    const device = freshDevice();
    (await cdnLaunch(device)).fallBackAndReload('listApp');
    const { markRemoteLoadSuccess } = await cdnLaunch(device);
    markRemoteLoadSuccess('listApp');
    expect(health(device, 'listApp')).toEqual({ version: '1.2.0', fails: 0 });
  });

  test('a render of the copy does not clear the count', async () => {
    const device = freshDevice();
    const first = await cdnLaunch(device);
    first.fallBackAndReload('listApp');
    first.markRemoteLoadSuccess('listApp');
    expect(health(device, 'listApp')).toEqual({ version: '1.2.0', fails: 1 });

    (await cdnLaunch(device)).fallBackAndReload('listApp');
    const rolledBack = await cdnLaunch(device);
    expect(rolledBack.getFederationStatus().rolledBack).toEqual(['listApp']);
    rolledBack.markRemoteLoadSuccess('listApp');
    expect(health(device, 'listApp')).toEqual({ version: '1.2.0', fails: 2 });
  });

  test('a new version starts the count over, and a bundled launch counts nothing', async () => {
    const device = freshDevice();
    (await cdnLaunch(device)).fallBackAndReload('listApp');
    (await cdnLaunch(device)).fallBackAndReload('listApp');

    serveCdn(signed({ ...VERSIONS, listApp: '1.3.0' }, 2));
    const fixed = loadFederation(CDN_BASE, '2.0.0', { ...RELEASE_WITH_COPIES, device });
    const status = await fixed.initializeFederation();
    expect(status.rolledBack).toEqual([]);
    expect(status.versions.listApp).toBe('1.3.0');
    fixed.fallBackAndReload('listApp');
    expect(health(device, 'listApp')).toEqual({ version: '1.3.0', fails: 1 });

    respondWith({}, false, 404);
    const bundled = loadFederation(CDN_BASE, '2.0.0', { ...RELEASE_WITH_COPIES, device });
    await bundled.initializeFederation();
    bundled.markRemoteLoadSuccess('listApp');
    expect(health(device, 'listApp')).toEqual({ version: '1.3.0', fails: 1 });
  });

  test('a remote with no copy is tried from the CDN however often it failed', async () => {
    const device = freshDevice();
    device.set('mf.health.partyApp', JSON.stringify({ version: '1.0.0', fails: 9 }));
    serveCdn(signed(VERSIONS));
    const { initializeFederation } = loadFederation(CDN_BASE, '2.0.0', {
      ...RELEASE_WITH_COPIES,
      copies: { versions: { listApp: '1.1.0' } },
      device,
    });
    const status = await initializeFederation();
    expect(status.rolledBack).toEqual([]);
    expect(status.versions.partyApp).toBe('1.0.0');
  });
});
