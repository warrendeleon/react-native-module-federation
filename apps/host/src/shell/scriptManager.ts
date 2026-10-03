import { NativeModules, Platform } from 'react-native';
import { ScriptManager } from '@callstack/repack/client';
import {
  getInstance,
  loadRemote,
  type ModuleFederationRuntimePlugin,
  registerPlugins,
  registerRemotes,
} from '@module-federation/runtime';

import NativeEmbeddedRemotes from '../../specs/NativeEmbeddedRemotesModule';
import { BUNDLED_VERSIONS } from './embedded-versions';
import { evaluateRemoteModule, guardHandledRemoteLoadErrors } from './federationErrors';
import {
  embeddedManifestUrl,
  type FederationMode,
  manifestRemote,
  parseVersionMap,
  remoteManifestUrl,
  resolveRemoteLocator,
  versionMapUrl,
  type VerifyMode,
} from './remoteLocator';

// --- How this app decides, at every launch, which code it is allowed to run.
//
//   dev         the two dev servers on :8082 and :8083 own everything. Nothing below changes
//               resolution; Re.Pack's own handling stands.
//   cdn         the app asks the CDN for the version map written for its own app version, and
//               loads exactly the remote versions that map names. Shipping a remote is then an
//               upload and one edited line, with no new binary and no store review.
//   bundled     the CDN's versions could not be used (no CDN is configured, the map could not
//               be fetched or read, or registering its versions failed), and the binary carries
//               its own copy of each remote, baked in when it was built. The whole launch runs
//               from those copies, read from the disk and verified exactly like a download.
//   unresolved  the CDN's versions could not be used, and no copy could be registered instead.
//               There is no version to load anything at, so the resolver refuses every remote
//               rather than let one load from an unversioned URL unverified, and the banner says
//               so.
//
// The decision is made once, before anything federated is imported, and the result is read back
// through getFederationStatus for the banner on screen.
//
// Inside a CDN launch one remote can still fail to load: a retired version, a container or chunk
// that does not arrive, one that does not verify. That remote drops to its own copy for the rest
// of the session while the others stay on the CDN. Only when there is no copy left to try does its
// tab show the error state, and even then the process survives it: federationErrors has why. ---

const REMOTE_NAMES = ['listApp', 'partyApp'] as const;
type RemoteName = (typeof REMOTE_NAMES)[number];

function isRemoteName(name: string): name is RemoteName {
  return (REMOTE_NAMES as readonly string[]).includes(name);
}

// --- Where each remote's runtime keeps the chunks it has installed: a global array, which its
// chunk files push onto as they load. A container starting up installs every chunk already in it,
// including chunks a previous container of the same remote fetched, so a reload clears it (see
// reloadRemote). The name is rspackChunk followed by the output.uniqueName each remote's
// rspack.config.mjs sets. ---
const CHUNK_REGISTRY: Record<RemoteName, string> = {
  listApp: 'rspackChunkListApp',
  partyApp: 'rspackChunkPartyApp',
};

// --- The two build-time literals, compiled in by DefinePlugin in rspack.config.mjs. They are
// declared rather than imported because they do not exist as modules: the bundler replaces each
// name with a string during the build. The typeof guards cover the one environment where the
// bundler is not involved — Jest — so importing this file in a test cannot throw on a name that
// was never substituted. ---
declare const __MF_CDN_BASE__: string;
declare const __APP_VERSION__: string;

const CDN_BASE = typeof __MF_CDN_BASE__ === 'string' ? __MF_CDN_BASE__ : '';
const APP_VERSION = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : '1.0.0';

// A CDN was configured for this build. A release build without one runs from its copies, when it
// carries any; a development build without one is the ordinary dev-server setup every earlier post
// used.
const CDN_CONFIGURED = CDN_BASE.length > 0;

// --- How long the launch waits for the version map. It is a boot gate: everything federated is
// behind it, and the request has no timeout of its own to fall back on. React Native builds
// Android's HTTP client with every timeout at zero and passes the request's own `timeout` through
// on iOS, where it defaults to zero, so a CDN that is merely slow would hold the app at its splash
// screen for as long as the network let it. AbortSignal.timeout() would say this in one line and
// does not exist in React Native's fetch, so the controller and the timer are wired by hand. ---
const PROBE_TIMEOUT_MS = 1500;

// --- Signature verification is only meaningful where there is a public key to verify against:
// the key is embedded in the iOS Info.plist and in Android's strings.xml, and nowhere else. On
// those two platforms it is strict, which means a chunk whose signature does not match the key,
// or which carries no signature at all, is rejected before it executes. ---
const SIGNED_PLATFORMS = ['ios', 'android'];
const VERIFY: VerifyMode = SIGNED_PLATFORMS.includes(Platform.OS) ? 'strict' : 'off';

// --- Where the copies in the binary sit on the device.
//
// On iOS they are inside the .app itself, and the JavaScript bundle's own URL points into it: a
// release build loads file:///…/Host.app/main.jsbundle, and the directory above that file is the
// .app. A development build loads its bundle from the dev server over http, so there is no
// directory to derive and no copy to use. Everything in this file that runs from a copy therefore
// needs a release build.
//
// On Android the copies are packed into the APK's assets, which are not files on disk. A native
// module copies them out once per installed build and says where it put them, before the first
// federated load (see prepareEmbeddedCopies). ---
const sourceCode = NativeModules.SourceCode as
  | { scriptURL?: string; getConstants?: () => { scriptURL?: string } }
  | undefined;
const SCRIPT_URL = sourceCode?.scriptURL ?? sourceCode?.getConstants?.().scriptURL;
const APP_PATH = SCRIPT_URL?.startsWith('file://')
  ? SCRIPT_URL.replace(/^file:\/\//, '').replace(/\/[^/]+$/, '')
  : undefined;

let embeddedRoot: string | undefined = Platform.OS === 'ios' ? APP_PATH : undefined;

// The version of each remote this build carries a copy of, as tools/build-cdn.mjs recorded it for
// this platform.
const bundledVersions: Record<string, string> = BUNDLED_VERSIONS[Platform.OS] ?? {};

function hasEmbeddedCopy(remote: string): boolean {
  return embeddedRoot !== undefined && bundledVersions[remote] !== undefined;
}

export interface FederationStatus {
  mode: FederationMode;
  /** Where the code came from, in the words the banner shows. */
  source: string;
  /** remote -> the version each remote is running this launch. Empty in development. */
  versions: Record<string, string>;
  /** The remotes running from their copy in the binary: all of them in bundled mode. */
  embedded: readonly string[];
}

let status: FederationStatus = {
  mode: 'dev',
  source: 'dev servers',
  versions: {},
  embedded: [],
};

// The versions the map named, kept apart from status.versions, which changes as remotes fall back.
let mapVersions: Record<string, string> = {};

// The banner re-renders when a remote falls back mid-session, so the status is published rather
// than only read. Every change replaces the object, which is what lets a subscriber compare the
// old snapshot with the new one.
const listeners = new Set<() => void>();

function setStatus(next: FederationStatus): void {
  status = next;
  listeners.forEach(listener => listener());
}

export function subscribeFederationStatus(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// --- The remotes that failed from the CDN this session and now run from their copy. In memory on
// purpose: a failure that was only the network heals at the next launch, which asks the CDN
// again. Remembering failures across launches, and rolling a bad version back for good, belongs
// to the next post. ---
const fallbackRemotes = new Set<string>();

// The in-flight (or finished) initialisation. Held as a promise rather than a boolean, so that a
// second caller arriving while the probe is still in the air waits for the same answer instead of
// being handed the state from before it started.
let initialization: Promise<FederationStatus> | undefined;

// --- The resolver. It is asked about every script the federation loads, in priority order, and
// the first resolver to return a locator wins. Re.Pack registers its own resolver per remote when
// that remote is registered, at the default priority of 2. Before the launch re-registers the
// remotes, that one hands back the unversioned URL from the build-time remotes map; after it, the
// versioned one, but with no signature verification on its locator. Priority 100 puts this one in
// front of it either way, so every script of these remotes is decided here: located at its version
// and verified, or refused.
//
// Registered here at module scope, so it is in place before anything federated can be imported,
// whatever order the launch runs in. Once webpack and the federation runtime have loaded a
// container or a chunk they never ask for it again, so a resolver added after a script's first
// load never sees that script. It is handed the fallback set itself rather than a copy, so a
// remote that falls back is served from its copy on its very next script. ---
ScriptManager.shared.addResolver(
  async (scriptId: string, caller?: string) => {
    const resolution = resolveRemoteLocator({
      scriptId,
      caller,
      remoteNames: REMOTE_NAMES,
      mode: status.mode,
      versions: mapVersions,
      bundledVersions,
      fallbackRemotes,
      embeddedRoot,
      platform: Platform.OS,
      cdnBase: CDN_BASE,
      verify: VERIFY,
    });
    if (resolution.kind === 'refuse') {
      // Thrown, not returned. Returning nothing passes the script to the next resolver, which for a
      // remote is Re.Pack's own and would load it unverified. Re.Pack's resolveScript stops at the
      // first resolver that throws, so the load fails and the tab shows its error state.
      throw new Error(`[federation] refused ${scriptId}: ${resolution.reason}`);
    }
    return resolution.kind === 'locate' ? resolution.locator : undefined;
  },
  { key: '__signed_resolver__', priority: 100 },
);

// --- A chunk that fails to load is reported to React Native's global handler as fatal before the
// boundary can show the tab's error state, and in a release build that report ends the process.
// The guard drops that one report so the boundary gets its turn; federationErrors.ts has the
// order in full. ---
guardHandledRemoteLoadErrors();

// --- A remote module that throws while it is evaluated is reported as fatal as well, by the
// guarded require inside the remote's own container, and carries nothing the guard can match. So
// every remote module is evaluated inside the window federationErrors.ts keeps for it. The runtime
// passes a module's factory to its plugins' onLoad hook before anything calls it only when the
// factory was asked for unexecuted, with loadFactory: false. loadRemoteModule asks that way for
// every remote module the host loads, the tabs and the boot loads alike, so each reaches the hook
// with a factory nothing has run yet. A function returned from the hook replaces the factory; this
// plugin returns one that runs the real factory inside evaluateRemoteModule. ---
const evaluationWindow: ModuleFederationRuntimePlugin = {
  name: 'evaluation-window',
  onLoad({ exposeModuleFactory }) {
    if (typeof exposeModuleFactory !== 'function') {
      return undefined;
    }
    return () => evaluateRemoteModule(exposeModuleFactory);
  },
};
registerPlugins([evaluationWindow]);

// --- The manifest net. Module Federation fetches a remote's mf-manifest.json before any of its
// code loads. A tab's boundary would hear of that fetch failing, but only once the runtime's own
// fetch gives up, and the runtime sets no time limit on it. And not every load runs inside a
// boundary: partyApp's state and styles modules ask for its manifest at boot, from an effect
// outside every tab. So the net sits where the runtime asks for every manifest, in a plugin's
// `fetch` hook, which the runtime calls before falling back to its own fetch.
//
// It only acts in a CDN launch. A bundled launch registered every remote at its copy's manifest,
// and the runtime reads that from the disk like any other: React Native's fetch opens a file://
// URL, through its file handler on iOS and its blob handler on Android. In a CDN launch:
//
//   - a remote that already fell back gets its copy's manifest, whatever URL it is still
//     registered at.
//   - a CDN remote gets a real fetch, and on a failed request (an error status such as a 404 for
//     a retired version, a timeout, a dropped connection) it falls back to its copy and gets the
//     copy's manifest instead. A manifest that arrives with a success status is returned as it
//     is; if it cannot be read, the runtime fails on it later: inside the tab's boundary for a
//     tab's load, and in App.tsx's catch for partyApp's boot loads.
//   - anything else, and any remote without a copy, is left to the runtime's own fetch.
//
// The hook may return a Promise of a Response, or nothing to hand the request back to the
// runtime. ---
const embeddedFallback: ModuleFederationRuntimePlugin = {
  name: 'embedded-fallback',
  fetch(url: string) {
    if (status.mode !== 'cdn') {
      return undefined;
    }
    const remote = manifestRemote(url, REMOTE_NAMES);
    if (!remote || !hasEmbeddedCopy(remote)) {
      return undefined;
    }
    if (fallbackRemotes.has(remote)) {
      return fetch(embeddedManifestUrlFor(remote));
    }
    return cdnManifestOrEmbedded(url, remote);
  },
};
registerPlugins([embeddedFallback]);

// --- A CDN remote's manifest, fetched for real, with the copy behind it. The wait is the probe's
// own: the map already answered within it, so a manifest that takes longer is treated as a
// failure too. ---
async function cdnManifestOrEmbedded(url: string, remote: string): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (response.ok) {
      return response;
    }
    console.warn(`[federation] ${remote} manifest returned ${response.status}`);
  } catch (error) {
    console.warn(`[federation] ${remote} manifest could not be fetched`, error);
  } finally {
    clearTimeout(timer);
  }
  fallBack(remote);
  return fetch(embeddedManifestUrlFor(remote));
}

// Record that a remote runs from its copy until the next launch, and put it on the banner.
function fallBack(remote: string): void {
  if (fallbackRemotes.has(remote)) {
    return;
  }
  fallbackRemotes.add(remote);
  console.warn(`[federation] ${remote} failed from the CDN; running its copy from the binary`);
  setStatus({
    ...status,
    versions: { ...status.versions, [remote]: bundledVersions[remote] },
    embedded: [...status.embedded, remote].sort(),
  });
}

// --- Fetch and read the version map for this app version. Returns null for every kind of
// failure, because the caller treats them all the same way: an unreachable CDN, a 404 for an app
// version nobody published a map for, a timeout, and a map that does not parse all end with this
// binary running its copies, or nothing if it has none. ---
async function fetchVersionMap(): Promise<Record<string, string> | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
  try {
    const response = await fetch(versionMapUrl(CDN_BASE, Platform.OS, APP_VERSION), {
      signal: controller.signal,
      // The map is the one file on the CDN that must never be served from a cache: it is the
      // record of what is current, and a stale copy is a silently undone deploy. Every other file
      // the app fetches carries its version in the URL and can be cached forever.
      headers: { 'cache-control': 'no-cache' },
    });
    if (!response.ok) {
      console.warn(`[federation] version map returned ${response.status}`);
      return null;
    }
    const versions = parseVersionMap((await response.json()) as unknown, REMOTE_NAMES);
    if (!versions) {
      // The one failure that is nobody's network and nobody's outage: the file was served and
      // could not be believed. Said out loud, because the alternative is an app that launches,
      // loads nothing and offers no reason.
      console.warn('[federation] version map was served but could not be read');
    }
    return versions;
  } catch (error) {
    console.warn('[federation] version map could not be fetched', error);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// --- Point every remote at the versioned manifest this launch resolved.
//
// force is not optional. Each remote is already registered under its name from the build-time
// remotes map, and registerRemotes leaves an already-registered name alone unless it is told
// otherwise: without the flag this call returns quietly, changes nothing, and the app loads the
// unversioned placeholder URLs instead. With it, Module Federation logs a warning about
// re-registering a remote on every launch, which is the expected cost of doing this. ---
function registerCdnRemotes(versions: Record<string, string>): void {
  registerRemotes(
    REMOTE_NAMES.filter(name => versions[name]).map(name => ({
      name,
      entry: remoteManifestUrl(CDN_BASE, Platform.OS, name, versions[name]),
    })),
    { force: true },
  );
}

// --- Android only: copy the baked-in remotes out of the APK's assets, so the resolver has a real
// directory to point at. It runs alongside the probe rather than before it, since neither needs
// the other. Best effort: when it fails, the launch behaves like a binary with no copies. ---
async function prepareEmbeddedCopies(): Promise<void> {
  if (Platform.OS !== 'android' || !NativeEmbeddedRemotes) {
    return;
  }
  try {
    embeddedRoot = await NativeEmbeddedRemotes.prepare(APP_VERSION);
  } catch (error) {
    console.warn('[federation] the copies in the binary could not be prepared', error);
  }
}

// --- Awaited in App.tsx before the navigator mounts, so that every remote is registered at its
// resolved version before the first React.lazy import can fire. Safe to call more than once and
// from more than one place at once: every caller gets the first call's promise. ---
export function initializeFederation(): Promise<FederationStatus> {
  initialization ??= resolveFederation();
  return initialization;
}

async function resolveFederation(): Promise<FederationStatus> {
  if (!CDN_CONFIGURED && __DEV__) {
    setStatus({ mode: 'dev', source: 'dev servers', versions: {}, embedded: [] });
    return status;
  }

  const [versions] = await Promise.all([
    CDN_CONFIGURED ? fetchVersionMap() : Promise.resolve(null),
    prepareEmbeddedCopies(),
  ]);
  if (!versions) {
    return runFromCopies(CDN_CONFIGURED ? 'no usable version map' : 'no CDN configured');
  }

  // The status is set before the registration because the resolver reads it, and then rolled back
  // if the registration throws. Claiming CDN mode after a failed re-registration would put the
  // versions on the banner while every load went to the build-time placeholder URL: an app that
  // says it is running 1.2.0 and is running nothing.
  mapVersions = versions;
  setStatus({ mode: 'cdn', source: CDN_BASE, versions, embedded: [] });
  try {
    registerCdnRemotes(versions);
  } catch (error) {
    console.warn('[federation] remotes could not be re-registered', error);
    mapVersions = {};
    return runFromCopies('remotes could not be registered');
  }
  return status;
}

// --- The launch that could not use the CDN: no usable map, no CDN configured, or a registration
// that failed. With copies in the binary it runs from them, every remote registered at its copy's
// manifest, which the runtime reads from the disk. With none, or when registering them fails too,
// there is nothing to run. ---
function runFromCopies(reason: string): FederationStatus {
  const embedded = REMOTE_NAMES.filter(hasEmbeddedCopy);
  if (embedded.length === 0) {
    setStatus({ mode: 'unresolved', source: reason, versions: {}, embedded: [] });
    return status;
  }
  const versions = Object.fromEntries(embedded.map(name => [name, bundledVersions[name]]));
  setStatus({ mode: 'bundled', source: 'the copy in the binary', versions, embedded });
  try {
    registerRemotes(
      embedded.map(name => ({ name, entry: embeddedManifestUrlFor(name) })),
      { force: true },
    );
  } catch (error) {
    console.warn('[federation] the copies could not be registered', error);
    setStatus({ mode: 'unresolved', source: 'remotes could not be registered', versions: {}, embedded: [] });
  }
  return status;
}

function embeddedManifestUrlFor(remote: string): string {
  return embeddedManifestUrl(embeddedRoot ?? '', Platform.OS, remote, bundledVersions[remote]);
}

export function getFederationStatus(): FederationStatus {
  return status;
}

// --- Every federated load in the host goes through here: the tabs' stacks and the two modules
// partyApp loads at boot. What makes it different from import() is that it asks the runtime every
// time. An import() of a remote compiles into a module of the host's own bundle, which keeps the
// result of the first attempt for the rest of the session, a failed one included; loadRemote has
// no such module in between, so a retry is a retry.
//
// It asks for the module's factory rather than its exports, because the factory is what the
// evaluationWindow plugin wraps: the runtime hands back the plugin's wrapper, and calling it here
// evaluates the module inside the window, where a module that throws as it is evaluated fails this
// load instead of ending the app. ---
export async function loadRemoteModule<T>(id: string): Promise<T | undefined> {
  const factory = await loadRemote<() => T>(id, { loadFactory: false, from: 'runtime' });
  return factory ? factory() : undefined;
}

// --- For the tab boundary. A CDN remote whose load gets past the manifest net and still fails (a
// container or chunk that did not arrive or did not verify, a manifest that arrived broken, a
// module that threw as it was evaluated) can drop to its copy, once. In bundled mode it is already
// on its copy, and in development the dev servers own it. ---
export function canFallBack(remote: string): boolean {
  return status.mode === 'cdn' && !fallbackRemotes.has(remote) && hasEmbeddedCopy(remote);
}

// Drop a remote to its copy and start its next load from nothing, at the copy's manifest.
export function fallBackAndReload(remote: string): void {
  if (!isRemoteName(remote) || !hasEmbeddedCopy(remote)) {
    return;
  }
  fallBack(remote);
  reloadRemote(remote, embeddedManifestUrlFor(remote));
}

// For Try again: start a remote's next load from nothing, from wherever it is registered now,
// which the federation runtime is asked rather than told. That covers every mode, development
// included, where the dev server's URL is known only to the build.
export function forceReloadRemote(remote: string): void {
  if (!isRemoteName(remote)) {
    return;
  }
  const registered = getInstance()?.options.remotes.find(entry => entry.name === remote);
  if (registered && 'entry' in registered) {
    reloadRemote(remote, registered.entry);
  }
}

// --- Make a remote's next load start from nothing. After a load that failed, two records of the
// remote outlive the failure, and a retry that leaves either behind replays it:
//
//   - the federation runtime keeps the remote's entry, the manifest it read and the container it
//     loaded, and a container load that failed, which it hands back to every later request.
//     Registering the remote again with force removes all of it, the container's global included,
//     and points the next load at `entry`.
//   - the remote's chunk registry keeps every chunk the last container fetched. A new container
//     installs them all before it fetches anything, so without this a remote dropping to its copy
//     would run the copy's container over chunks from the CDN. One gap stays open: a chunk the
//     failed container was still downloading lands in whichever registry exists when it arrives,
//     and nothing here can cancel the download. Re.Pack also hands a new request for a script
//     still loading the promise already outstanding. When the copy is the version the CDN was
//     serving, the default, it is the same bytes either way.
//
// Re.Pack's script cache is not a third. Once a resolved script's load settles it keeps no promise
// to replay, and a download that fails verification is never written to its cache, on either
// platform. A refusal from the resolver comes before that cleanup and is kept, but the resolver
// here refuses only a remote it has no version or copy for. ---
function reloadRemote(remote: RemoteName, entry: string): void {
  try {
    registerRemotes([{ name: remote, entry }], { force: true });
  } catch (error) {
    console.warn(`[federation] ${remote} could not be registered again`, error);
  }
  delete (globalThis as Record<string, unknown>)[CHUNK_REGISTRY[remote]];
}
