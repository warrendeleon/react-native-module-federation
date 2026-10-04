import { createMMKV } from 'react-native-mmkv';

// --- What the host remembers between launches. Two things, both from the federation layer and
// both small: the highest release counter it has accepted, and a per-remote record of how many
// launches in a row the version the map names has failed. Both are read during the boot gate,
// before anything federated loads, so the store has to answer synchronously: a promise-based
// store would add an await to a path the splash screen is already waiting on.
//
// MMKV is that store: a key-value file read and written synchronously through JSI, with one
// instance for the whole host and each consumer under its own key prefix. A test process has no
// native side; the library notices Jest and keeps the values in memory instead, so the launch
// code runs unchanged under test. ---

export const storage = createMMKV({ id: 'federation' });

/** The highest release counter accepted so far; zero before any map has been. */
export const VERSION_MAP_SEQ_KEY = 'mf.versionMap.seq';

/** The health record of one remote: a JSON RemoteHealth under this key. */
export function remoteHealthKey(remote: string): string {
  return `mf.health.${remote}`;
}
