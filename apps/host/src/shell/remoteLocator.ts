// --- The decision behind every script the federation loads in production, kept as plain
// functions so it can be tested without a device, a network or Re.Pack's native side.
//
// In development nothing here has an opinion: the dev servers own resolution and every function
// defers. In CDN mode the host has already been told, by the version map it fetched at launch,
// which version of each remote this binary may run. From that one fact each script — a remote's
// container, or any chunk that container later asks for — resolves to a URL inside that version's
// directory, with signature verification switched on. ---

export type FederationMode = 'dev' | 'cdn' | 'unresolved';
export type VerifyMode = 'strict' | 'off';

export interface RemoteLocator {
  url: string;
  cache: boolean;
  verifyScriptSignature: VerifyMode;
}

export interface ResolveInput {
  /** The container's name for a container, otherwise the chunk's own id. */
  scriptId: string;
  /** The container that asked for the chunk; undefined when the container itself is loading. */
  caller: string | undefined;
  remoteNames: readonly string[];
  mode: FederationMode;
  /** remote -> version, as the version map pinned it for this launch. */
  versions: Record<string, string>;
  platform: string;
  cdnBase: string;
  verify: VerifyMode;
}

// --- Which remote a script belongs to. A container announces itself: its script id IS the remote
// name. A chunk does not, so the caller is the only thing that says where it came from, and it is
// why the resolver takes both arguments rather than pattern-matching the id. ---
function remoteFor(
  scriptId: string,
  caller: string | undefined,
  remoteNames: readonly string[],
): string | undefined {
  if (remoteNames.includes(scriptId)) {
    return scriptId;
  }
  if (caller && remoteNames.includes(caller)) {
    return caller;
  }
  return undefined;
}

// --- Map one script to the URL it should be fetched from, or undefined to let Re.Pack resolve it
// the way it always has. Deferring is the right answer more often than it looks: in development,
// for anything that is not one of this host's remotes, and for a remote the version map said
// nothing about — in that last case there is no version to build a URL out of, and a guess would
// be worse than a failure a reader can see. ---
export function resolveRemoteLocator(input: ResolveInput): RemoteLocator | undefined {
  if (input.mode !== 'cdn') {
    return undefined;
  }
  const remoteName = remoteFor(input.scriptId, input.caller, input.remoteNames);
  if (!remoteName) {
    return undefined;
  }
  const version = input.versions[remoteName];
  if (!version) {
    return undefined;
  }
  const filename =
    input.scriptId === remoteName
      ? `${remoteName}.container.js.bundle`
      : `${input.scriptId}.chunk.bundle`;
  return {
    url: `${input.cdnBase}/${input.platform}/${remoteName}/${version}/${filename}`,
    // Caching is per URL, and a URL here carries its version, so a cached file can only ever be
    // served for the version it was fetched for. A new version is a new URL and a fresh download.
    cache: true,
    verifyScriptSignature: input.verify,
  };
}

// --- Where this binary asks what it may run. The app version is in the path rather than a query
// string so that every answer is a plain file a static server can hold, and so a proxy or CDN
// treats two app versions as two resources. ---
export function versionMapUrl(cdnBase: string, platform: string, appVersion: string): string {
  return `${cdnBase}/${platform}/maps/${appVersion}/version-map.json`;
}

// --- The manifest URL a remote is re-registered at for this launch. ---
export function remoteManifestUrl(
  cdnBase: string,
  platform: string,
  remoteName: string,
  version: string,
): string {
  return `${cdnBase}/${platform}/${remoteName}/${version}/mf-manifest.json`;
}

// --- What a version is allowed to look like. Every version in the map becomes a path segment in
// a URL this app then downloads code from, so it is checked before it is used rather than after:
// a slash would climb out of the version directory, and a percent sign or a space would build a
// URL nobody wrote. Letters, digits, dots, dashes and underscores cover every version this series
// publishes, and a version must start with a letter or a digit, which is what rules out "..". The
// length is bounded for the same reason the characters are: it ends up in a URL, and nothing
// anyone publishes needs sixty-four characters to name a release. ---
const SAFE_VERSION = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;

// --- The version map arrives over the network, so it is treated as a stranger's JSON rather than
// as a typed object: anything that is not a flat object of known remote names to well-formed
// versions is refused whole. Refusing the whole map rather than filtering it is deliberate — a
// half-read map would launch the app on a set of versions nobody published. ---
export function parseVersionMap(
  raw: unknown,
  remoteNames: readonly string[],
): Record<string, string> | null {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return null;
  }
  const entries = Object.entries(raw as Record<string, unknown>);
  const versions: Record<string, string> = {};
  for (const [name, version] of entries) {
    if (!remoteNames.includes(name)) {
      // An unknown remote is not an error: a CDN serving several apps, or a map written ahead of
      // a host release, will name remotes this binary has never heard of. Ignore them.
      continue;
    }
    if (typeof version !== 'string' || !SAFE_VERSION.test(version)) {
      return null;
    }
    versions[name] = version;
  }
  return Object.keys(versions).length > 0 ? versions : null;
}
