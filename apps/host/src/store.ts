import { combineSlices, configureStore } from '@reduxjs/toolkit';
import { baseApi } from '@pokedex/contracts';

// --- The host store. combineSlices (RTK 2.x) roots the store on the shared RTK Query slice and
// leaves the door open for a remote to call rootReducer.inject(theirSlice) later, registering its own
// reducers at runtime — that is the next post. For now the only slice is baseApi's: the shared
// server-state cache every remote reads from and writes to through the one instance that lives in
// @pokedex/contracts. ---
const rootReducer = combineSlices(baseApi);
export type RootState = ReturnType<typeof rootReducer>;

export const store = configureStore({
  reducer: rootReducer,
  // baseApi.middleware runs the cache lifecycle: fetching, request deduplication, tag invalidation,
  // and cache eviction. Leave it off the store and a remote's injected endpoints still register, but
  // nothing ever fetches — the screen hangs on its loading state.
  middleware: getDefaultMiddleware => getDefaultMiddleware().concat(baseApi.middleware),
});

export type AppDispatch = typeof store.dispatch;

// Exposed so a federated remote can inject its own reducers against the host's single store instance,
// shared at runtime through the @reduxjs/toolkit Module Federation singleton. The list remote injects
// only endpoints here; reducer injection arrives with client state in the next post.
export { rootReducer };
