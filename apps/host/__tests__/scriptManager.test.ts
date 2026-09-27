// --- The two facts this module rests on, neither of which a type checker or a reading can
// confirm, and both of which fail silently on a device: the resolver has to be registered ahead
// of Re.Pack's own, and the re-registration has to be forced. And, from the fallback post on, what
// the host does when the CDN fails it: at launch, and one remote at a time mid-session.
//
// All of it is asked of the stand-ins the host installs for the Re.Pack client and the Module
// Federation runtime, which record what they were handed. Each case loads the module fresh, with
// the build-time literals defined first, because the module reads them once at import and holds
// its initialisation for the life of the process.

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

// The copies a test build carries: which version of each remote, and that version's manifest. A
// test that needs a binary with no copy of a remote leaves it out.
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
  copies?: {
    versions: Record<string, string>;
    manifests: Record<string, unknown>;
  };
}

function loadFederation(cdnBase: string, appVersion: string, build: Build = {}) {
  const globals = globalThis as unknown as Record<string, unknown>;
  globals.__MF_CDN_BASE__ = cdnBase;
  globals.__APP_VERSION__ = appVersion;
  const copies = build.copies ?? { versions: {}, manifests: {} };

  let loaded!: typeof import('../src/shell/scriptManager');
  let repack!: Recorder;
  let runtime!: Recorder;
  jest.isolateModules(() => {
    const { NativeModules } = require('react-native');
    NativeModules.SourceCode = { scriptURL: build.scriptURL };
    jest.doMock('../src/shell/embedded-manifests', () => ({
      BUNDLED_VERSIONS: { ios: copies.versions },
      EMBEDDED_MANIFESTS: { ios: copies.manifests },
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

// The CDN as a set of paths: the map for the launch, and whatever manifests a test serves. Any
// other path is a 404, which is also what a retired version looks like.
function serveCdn(map: unknown, manifests: Record<string, unknown> = {}) {
  globalThis.fetch = jest.fn(async (url: string) => {
    if (url.endsWith('/version-map.json')) {
      return { ok: true, status: 200, json: async () => map };
    }
    if (url in manifests) {
      return new Response(JSON.stringify(manifests[url]), { status: 200 });
    }
    return { ok: false, status: 404, json: async () => ({}) };
  }) as unknown as typeof fetch;
}

const cdnManifest = (remote: string, version: string) =>
  `${CDN_BASE}/ios/${remote}/${version}/mf-manifest.json`;
const embeddedManifest = (remote: string, version: string) =>
  `file://${APP_PATH}/cdn/ios/${remote}/${version}/mf-manifest.json`;
const theFetchHook = (runtime: Recorder) =>
  runtime.__plugins.find(plugin => plugin.name === 'embedded-fallback')!.fetch!;

beforeEach(() => {
  // Every failure case below warns on purpose. Silenced so a run that passes prints nothing, and
  // spied rather than ignored so a case that stops warning is still a visible change.
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
    respondWith({ listApp: '1.2.0' });
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
    respondWith({ listApp: '1.2.0', partyApp: '1.0.0' });
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
    respondWith({ listApp: '1.0.0', partyApp: '1.0.0' });
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
    ['the map does not parse', () => respondWith({ listApp: '../../..' })],
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
      copies: { versions: { listApp: '1.1.0' }, manifests: { listApp: COPIES.manifests.listApp } },
    });
    const status = await initializeFederation();
    expect(status.mode).toBe('bundled');
    expect(status.embedded).toEqual(['listApp']);
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
  test('serves the copy\'s manifest in bundled mode, without asking the network', async () => {
    respondWith({}, false, 404);
    const { initializeFederation, runtime } = loadFederation(CDN_BASE, '2.0.0', RELEASE_WITH_COPIES);
    await initializeFederation();
    const requests = (globalThis.fetch as jest.Mock).mock.calls.length;

    const response = await theFetchHook(runtime)(embeddedManifest('listApp', '1.1.0'));
    expect(response).toBeInstanceOf(Response);
    await expect(response!.json()).resolves.toEqual(COPIES.manifests.listApp);
    expect((globalThis.fetch as jest.Mock).mock.calls.length).toBe(requests);
  });

  test('hands a healthy CDN manifest through as it came', async () => {
    const manifest = { id: 'listApp', from: 'the CDN' };
    serveCdn({ listApp: '1.2.0', partyApp: '1.0.0' }, { [cdnManifest('listApp', '1.2.0')]: manifest });
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
    ['answers 404', () => serveCdn({ listApp: '1.2.0', partyApp: '1.0.0' })],
    [
      'cannot be reached',
      () => {
        serveCdn({ listApp: '1.2.0', partyApp: '1.0.0' });
        const cdn = globalThis.fetch as jest.Mock;
        const map = cdn.getMockImplementation()!;
        cdn.mockImplementation(async (url: string) => {
          if (url.endsWith('/mf-manifest.json')) {
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

    expect(getFederationStatus()).toEqual({
      mode: 'cdn',
      source: CDN_BASE,
      versions: { listApp: '1.1.0', partyApp: '1.0.0' },
      embedded: ['listApp'],
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

  test('leaves every other request to the runtime', async () => {
    serveCdn({ listApp: '1.2.0', partyApp: '1.0.0' });
    const { initializeFederation, runtime } = loadFederation(CDN_BASE, '2.0.0', {
      ...RELEASE_WITH_COPIES,
      copies: { versions: { listApp: '1.1.0' }, manifests: { listApp: COPIES.manifests.listApp } },
    });
    await initializeFederation();
    const hook = theFetchHook(runtime);

    // Not a manifest, and a manifest of no remote this host knows.
    expect(hook(`${CDN_BASE}/ios/listApp/1.2.0/listApp.container.js.bundle`)).toBeUndefined();
    expect(hook(`${CDN_BASE}/ios/otherApp/1.0.0/mf-manifest.json`)).toBeUndefined();
    // A remote this binary carries no copy of: nothing to fall back to, so the runtime's own fetch.
    expect(hook(cdnManifest('partyApp', '1.0.0'))).toBeUndefined();
  });

  test('stays out of the way in development', async () => {
    const { initializeFederation, runtime } = loadFederation('', '2.0.0', { copies: COPIES });
    await initializeFederation();
    expect(theFetchHook(runtime)('http://localhost:8082/ios/mf-manifest.json')).toBeUndefined();
  });
});

describe('reloading a remote', () => {
  async function cdnLaunch() {
    serveCdn({ listApp: '1.2.0', partyApp: '1.0.0' });
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
    // The other remote's chunks are its own business.
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
