import { Platform } from 'react-native';
import { ScriptManager } from '@callstack/repack/client';
import { registerRemotes } from '@module-federation/runtime';

import {
  type FederationMode,
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
//   unresolved  the map could not be fetched or could not be read. There is no version to load
//               anything at, so no remote can load, and the banner says so.
//
// The decision is made once, before anything federated is imported, and the result is read back
// through getFederationStatus for the banner on screen.
//
// What this app does NOT have yet is anywhere else to get a remote from. A chunk that fails —
// unresolved mode, a retired version, a signature that does not verify — is a tab that cannot
// render in a development build, and in a release build it is worse than that: the failure
// arrives as an uncaught ChunkLoadError and React Native's fatal handler ends the process before
// the boundary in App.tsx is reached. Measured on a release build rather than assumed. Giving
// the binary a copy of its own to fall back on is the next post's whole subject; until then, a
// release build that cannot reach its chunks is a release build that does not run. ---

const REMOTE_NAMES = ['listApp', 'partyApp'] as const;

// --- The two build-time literals, compiled in by DefinePlugin in rspack.config.mjs. They are
// declared rather than imported because they do not exist as modules: the bundler replaces each
// name with a string during the build. The typeof guards cover the one environment where the
// bundler is not involved — Jest — so importing this file in a test cannot throw on a name that
// was never substituted. ---
declare const __MF_CDN_BASE__: string;
declare const __APP_VERSION__: string;

const CDN_BASE = typeof __MF_CDN_BASE__ === 'string' ? __MF_CDN_BASE__ : '';
const APP_VERSION = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : '1.0.0';

// A CDN was configured for this build. A release build without one has nowhere to load from; a
// development build without one is the ordinary dev-server setup every earlier post used.
const CDN_CONFIGURED = CDN_BASE.length > 0;

// --- How long the launch waits for the version map. It is a boot gate: everything federated is
// behind it, so a CDN that is merely slow must not hold the app at its splash screen for as long
// as the platform's default fetch timeout, which is 30 seconds. AbortSignal.timeout() would say
// this in one line and does not exist in React Native's fetch, so the controller and the timer
// are wired by hand. ---
const PROBE_TIMEOUT_MS = 1500;

// --- Signature verification is only meaningful where there is a public key to verify against:
// the key is embedded in the iOS Info.plist and in Android's strings.xml, and nowhere else. On
// those two platforms it is strict, which means a chunk whose signature does not match the key,
// or which carries no signature at all, is rejected before it executes. ---
const SIGNED_PLATFORMS = ['ios', 'android'];
const VERIFY: VerifyMode = SIGNED_PLATFORMS.includes(Platform.OS) ? 'strict' : 'off';

export interface FederationStatus {
  mode: FederationMode;
  /** Where the code came from, in the words the banner shows. */
  source: string;
  /** remote -> version for this launch. Empty outside CDN mode. */
  versions: Record<string, string>;
}

let status: FederationStatus = {
  mode: 'dev',
  source: 'dev servers',
  versions: {},
};

// The in-flight (or finished) initialisation. Held as a promise rather than a boolean, so that a
// second caller arriving while the probe is still in the air waits for the same answer instead of
// being handed the state from before it started.
let initialization: Promise<FederationStatus> | undefined;

// --- The resolver. It is asked about every script the federation loads, in priority order, and
// the first resolver to return a locator wins. Re.Pack registers its own resolver per remote when
// that remote is registered, at the default priority of 2, and that one would hand back the
// unversioned URL from the build-time remotes map. Priority 100 puts this one in front of it.
//
// Registered here at module scope, not inside initializeFederation, because a resolver that is
// not in place before the first import is a resolver that missed its only chance: resolution
// happens once per script, and the answer is cached. ---
ScriptManager.shared.addResolver(
  async (scriptId: string, caller?: string) =>
    resolveRemoteLocator({
      scriptId,
      caller,
      remoteNames: REMOTE_NAMES,
      mode: status.mode,
      versions: status.versions,
      platform: Platform.OS,
      cdnBase: CDN_BASE,
      verify: VERIFY,
    }),
  { key: '__signed_resolver__', priority: 100 },
);

// --- Fetch and read the version map for this app version. Returns null for every kind of
// failure, because the caller treats them all the same way: an unreachable CDN, a 404 for an app
// version nobody published a map for, a timeout, and a map that does not parse all end with this
// binary running no remotes. ---
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

// --- Awaited in App.tsx before the navigator mounts, so that every remote is registered at its
// resolved version before the first React.lazy import can fire. Safe to call more than once and
// from more than one place at once: every caller gets the first call's promise. ---
export function initializeFederation(): Promise<FederationStatus> {
  initialization ??= resolveFederation();
  return initialization;
}

async function resolveFederation(): Promise<FederationStatus> {
  if (!CDN_CONFIGURED) {
    status = __DEV__
      ? { mode: 'dev', source: 'dev servers', versions: {} }
      : { mode: 'unresolved', source: 'no CDN configured', versions: {} };
    return status;
  }

  const versions = await fetchVersionMap();
  if (!versions) {
    // Worded to cover every way this fails, because the banner is a claim the app makes about
    // itself: a map that was served and refused is not an unreachable one, and the log line
    // beside it already says which of the two happened.
    status = { mode: 'unresolved', source: 'no usable version map', versions: {} };
    return status;
  }

  // The status is set before the registration because the resolver reads it, and then rolled back
  // if the registration throws. Claiming CDN mode after a failed re-registration would put the
  // versions on the banner while every load went to the build-time placeholder URL: an app that
  // says it is running 1.2.0 and is running nothing.
  status = { mode: 'cdn', source: CDN_BASE, versions };
  try {
    registerCdnRemotes(versions);
  } catch (error) {
    console.warn('[federation] remotes could not be re-registered', error);
    status = { mode: 'unresolved', source: 'remotes could not be registered', versions: {} };
  }
  return status;
}

export function getFederationStatus(): FederationStatus {
  return status;
}
