// --- The decision behind every script the federation loads in production, kept as plain
// functions so it can be tested without a device, a network or Re.Pack's native side.
//
// In development nothing here has an opinion: the dev servers own resolution and every function
// defers. In CDN mode the host has already been told, by the version map it fetched at launch,
// which version of each remote this binary may run. From that one fact each script (a remote's
// container, or any chunk that container later asks for) resolves to a URL inside that version's
// directory, with signature verification switched on.
//
// The binary also carries a copy of each remote, baked in at build time. A script is served from
// that copy when the whole launch is running without the CDN (bundled mode), or when that one
// remote has already failed from the CDN this session and fallen back. ---

export type FederationMode = 'dev' | 'cdn' | 'bundled' | 'unresolved';
export type VerifyMode = 'strict' | 'off';

export interface RemoteLocator {
  url: string;
  cache: boolean;
  /** Set for a file:// URL, which Re.Pack must load as it is rather than resolve against the app. */
  absolute?: boolean;
  verifyScriptSignature: VerifyMode;
}

/** The resolver's decision for one script. */
export type Resolution =
  | { kind: 'defer' }
  | { kind: 'locate'; locator: RemoteLocator }
  | { kind: 'refuse'; reason: string };

export interface ResolveInput {
  /** The container's name for a container, otherwise the chunk's own id. */
  scriptId: string;
  /** The container that asked for the chunk; undefined when the container itself is loading. */
  caller: string | undefined;
  remoteNames: readonly string[];
  mode: FederationMode;
  /** remote -> version, as the version map pinned it for this launch. */
  versions: Record<string, string>;
  /** remote -> version of the copy baked into this binary. */
  bundledVersions: Record<string, string>;
  /** Remotes that failed from the CDN this session and now load from the baked-in copy. */
  fallbackRemotes: ReadonlySet<string>;
  /** The directory the baked-in copies sit under on the device; undefined when there is none. */
  embeddedRoot: string | undefined;
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

// --- Decide one script: locate it inside its version's directory, refuse it, or defer it to
// Re.Pack's own resolution.
//
// Deferring hands the script to the next resolver, and for one of this host's remotes the next
// one is Re.Pack's per-remote resolver: it answers with a URL built from whichever manifest was
// registered last and no signature check at all. That is the right answer in development, where
// the dev servers own everything, and for any script that is not one of this host's remotes.
// Outside development it is never the right answer for a remote. A remote that runs from its copy,
// in a bundled launch or after it fell back, is located in the copy; any other remote needs the
// version the map named for it, and without one, deferring would load code from an unversioned
// URL, unverified. So a remote with no version, or with no copy to read when it runs from one, is
// refused, and the refusal surfaces as the tab's error state. ---
export function resolveRemoteLocator(input: ResolveInput): Resolution {
  if (input.mode === 'dev') {
    return { kind: 'defer' };
  }
  const remoteName = remoteFor(input.scriptId, input.caller, input.remoteNames);
  if (!remoteName) {
    return { kind: 'defer' };
  }
  const filename =
    input.scriptId === remoteName
      ? `${remoteName}.container.js.bundle`
      : `${input.scriptId}.chunk.bundle`;
  if (input.mode === 'bundled' || input.fallbackRemotes.has(remoteName)) {
    return locateEmbedded(input, remoteName, filename);
  }
  const version = input.mode === 'cdn' ? input.versions[remoteName] : undefined;
  if (!version) {
    return {
      kind: 'refuse',
      reason:
        input.mode === 'cdn'
          ? `the version map named no version for ${remoteName}`
          : `no version map was read at launch, so ${remoteName} has no version to load`,
    };
  }
  return {
    kind: 'locate',
    locator: {
      url: `${input.cdnBase}/${input.platform}/${remoteName}/${version}/${filename}`,
      // Caching is per URL, and a URL here carries its version, so a cached file can only ever be
      // served for the version it was fetched for. A new version is a new URL and a fresh download.
      cache: true,
      verifyScriptSignature: input.verify,
    },
  };
}

// --- A script from the copy baked into the binary.
//
// The URL is an absolute file:// path, for a reason that is easy to miss. Without `absolute`,
// Re.Pack keeps only the file's name and looks for it at the top level of the app: in the app
// bundle's resources on iOS, in the APK's assets on Android. The copy keeps each version in its
// own <remote>/<version>/ directory, because two remotes can ship vendor chunks with the same
// name, so a lookup by name alone never reaches it. With `absolute`, the path is read as given.
//
// Verification stays on. The copy is the same signed bytes the CDN serves, and Re.Pack checks a
// file on disk exactly as it checks a download, which is also why the copy is never rewritten on
// its way into the app. A binary with no copy of this remote, or nowhere to read one from, is
// refused rather than deferred, for the same reason as above: deferring loads it unverified. ---
function locateEmbedded(
  input: ResolveInput,
  remoteName: string,
  filename: string,
): Resolution {
  const version = input.bundledVersions[remoteName];
  if (!version) {
    return {
      kind: 'refuse',
      reason: `this binary carries no copy of ${remoteName}`,
    };
  }
  if (!input.embeddedRoot) {
    return {
      kind: 'refuse',
      reason: `the copy of ${remoteName} has no directory to load from on this build`,
    };
  }
  return {
    kind: 'locate',
    locator: {
      url: `file://${input.embeddedRoot}/cdn/${input.platform}/${remoteName}/${version}/${filename}`,
      cache: true,
      absolute: true,
      verifyScriptSignature: input.verify,
    },
  };
}

// --- Where this binary asks what it may run. The app version is in the path rather than a query
// string so that every answer is a plain file a static server can hold, and so a proxy or CDN
// treats two app versions as two resources. ---
export function versionMapUrl(
  cdnBase: string,
  platform: string,
  appVersion: string,
): string {
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

// --- The manifest URL a remote is registered at when it runs from the copy in the binary. The copy
// carries the version's mf-manifest.json beside its bundles, and the federation runtime reads it
// from this file:// URL with React Native's fetch, the way it reads one from the CDN. ---
export function embeddedManifestUrl(
  embeddedRoot: string,
  platform: string,
  remoteName: string,
  version: string,
): string {
  return `file://${embeddedRoot}/cdn/${platform}/${remoteName}/${version}/mf-manifest.json`;
}

// --- Which of this host's remotes a manifest URL belongs to, or undefined for any other request.
// Every manifest the host registers, on the CDN or in the binary, sits inside a directory named
// after its remote. ---
export function manifestRemote(
  url: string,
  remoteNames: readonly string[],
): string | undefined {
  if (!url.endsWith('/mf-manifest.json')) {
    return undefined;
  }
  return remoteNames.find(name => url.includes(`/${name}/`));
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
