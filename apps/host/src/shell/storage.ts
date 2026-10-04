import { createMMKV } from 'react-native-mmkv';

// --- What the host remembers between launches. Two things, both from the federation layer and
// both small: the highest release counter it has accepted, and a per-remote record of how many
// launches the version the map names has failed since it last rendered from the CDN. Both are
// read during the boot gate, before anything federated loads. The counter is written at the end
// of the boot gate, once the map's versions have registered, and the health record is written
// from the failure and render hooks, so a store that answers synchronously keeps all three paths
// free of extra awaits.
//
// MMKV is that store: a key-value file read and written synchronously through JSI, with one
// instance for the whole host and each consumer under its own key prefix. A test process has no
// native side; the library notices Jest and keeps the values in memory instead, once jest.config.js
// has replaced Nitro, whose native lookup would otherwise throw as MMKV is imported, so the launch
// code runs unchanged under test. ---

export const storage = createMMKV({ id: 'federation' });

/** The highest release counter accepted so far; zero before any map has been. */
export const VERSION_MAP_SEQ_KEY = 'mf.versionMap.seq';

/** The health record of one remote: a JSON RemoteHealth under this key. */
export function remoteHealthKey(remote: string): string {
  return `mf.health.${remote}`;
}
