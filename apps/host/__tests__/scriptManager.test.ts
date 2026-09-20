// --- The two facts this module rests on, neither of which a type checker or a reading can
// confirm, and both of which fail silently on a device: the resolver has to be registered ahead
// of Re.Pack's own, and the re-registration has to be forced.
//
// Both are asked of the stand-ins the host installs for the Re.Pack client and the Module
// Federation runtime, which record what they were handed. Each case loads the module fresh, with
// the build-time literals defined first, because the module reads them once at import and holds
// its initialisation for the life of the process.

type Recorder = {
  __resolvers: [unknown, { key?: string; priority?: number }][];
  __calls: { remotes: { name: string; entry: string }[]; options?: { force?: boolean } }[];
};

const CDN_BASE = 'https://cdn.example.com';

function loadFederation(cdnBase: string, appVersion: string) {
  const globals = globalThis as unknown as Record<string, unknown>;
  globals.__MF_CDN_BASE__ = cdnBase;
  globals.__APP_VERSION__ = appVersion;

  let loaded!: typeof import('../src/shell/scriptManager');
  let repack!: Recorder;
  let runtime!: Recorder;
  jest.isolateModules(() => {
    repack = require('@callstack/repack/client') as unknown as Recorder;
    runtime = require('@module-federation/runtime') as unknown as Recorder;
    loaded = require('../src/shell/scriptManager');
  });
  return { ...loaded, repack, runtime };
}

function respondWith(body: unknown, ok = true, status = 200) {
  globalThis.fetch = jest.fn().mockResolvedValue({
    ok,
    status,
    json: async () => body,
  }) as unknown as typeof fetch;
}

beforeEach(() => {
  // Every failure case below warns on purpose. Silenced so a run that passes prints nothing, and
  // spied rather than ignored so a case that stops warning is still a visible change.
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  const globals = globalThis as unknown as Record<string, unknown>;
  delete globals.__MF_CDN_BASE__;
  delete globals.__APP_VERSION__;
  jest.restoreAllMocks();
});

describe('the resolver the host installs', () => {
  // Re.Pack registers a resolver per remote at its default priority of 2, and that one hands back
  // the unversioned URL from the build-time remotes map. Anything at or below 2 here loses to it,
  // and loses quietly: the app runs, and every remote is the wrong build.
  test('outranks the one Re.Pack registers per remote', () => {
    const { repack } = loadFederation(CDN_BASE, '2.0.0');
    const [[, options]] = repack.__resolvers;
    expect(options.priority).toBeGreaterThan(2);
    expect(options.key).toBe('__signed_resolver__');
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
  ])('reports unresolved and registers nothing when %s', async (_case, arrange) => {
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
