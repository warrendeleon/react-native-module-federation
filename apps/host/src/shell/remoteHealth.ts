// --- Whether a version of a remote has failed often enough to stop trying it, decided as plain
// functions over a record the host keeps between launches. scriptManager.ts stores the record and
// asks these questions at boot and at every failure; the boundary in App.tsx reports a render, and
// only a render of the CDN version clears it.
//
// A signed map protects the map's history, not the behaviour of what it names: a map can be
// signed, current and wrong, pointing at a version that fails to load on every launch, because its
// manifest, container or chunks do not arrive or verify, or because it throws as it is evaluated.
// Post 16's nets catch that failure once per session and run the copy, then the next launch asks
// the CDN again and fails the same way. The RemoteHealth record turns that into a decision. It
// counts only failures the nets catch: a version that loads and then throws as it renders keeps
// its tab's error state, as post 16 decided, and is never counted. ---

export interface RemoteHealth {
  /** The CDN version the failures were counted against. */
  version: string;
  /**
   * How many launches have failed to load that version since it last rendered from the CDN. Only
   * a render of the CDN version in its tab clears the count. partyApp's boot loads in App.tsx can
   * add to it with no tab open.
   */
  fails: number;
}

// --- How many failed launches it takes, counted since the version last rendered from the CDN.
// One failure is weather: a dropped connection, a CDN edge that was slow once. Two is a pattern.
// Three would make users wait through one more failed attempt, up to the probe timeout, to gain
// little confidence. ---
export const FAILURE_THRESHOLD = 2;

/** The record after a failed load. The same version counts up; a different one starts at one. */
export function nextHealthOnFailure(previous: RemoteHealth | null, version: string): RemoteHealth {
  return previous && previous.version === version
    ? { version, fails: previous.fails + 1 }
    : { version, fails: 1 };
}

// --- The record after the remote rendered, or null when there is nothing to write. The count is
// cleared only by a render of the CDN version: a remote that fell back is rendering its copy, so
// what rendered is not the version the count is about, and clearing it would reset a consistently
// broken version every launch and let it never reach the threshold. Null also when there is no
// version, as in bundled and dev mode, and when the record already names this version with a zero
// count, so the caller can skip a write that changes nothing. ---
export function nextHealthOnSuccess(
  previous: RemoteHealth | null,
  version: string | undefined,
  renderedTheCopy: boolean,
): RemoteHealth | null {
  if (renderedTheCopy || !version) {
    return null;
  }
  if (previous && previous.version === version && previous.fails === 0) {
    return null;
  }
  return { version, fails: 0 };
}

// --- Whether the version the map names now should be skipped for the copy this launch. Only the
// record for that exact version counts: a fixed release has a new version string, and the old
// one's failures must not hold it back. ---
export function shouldRollBack(
  health: RemoteHealth | null,
  version: string,
  threshold: number = FAILURE_THRESHOLD,
): boolean {
  return health !== null && health.version === version && health.fails >= threshold;
}
