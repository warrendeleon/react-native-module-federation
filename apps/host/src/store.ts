import { combineSlices, configureStore } from '@reduxjs/toolkit';
import { baseApi } from '@pokedex/contracts';

// --- The host store. The store lives here, in the shell — but the api instance it is built around
// lives in @pokedex/contracts, because every consumer needs to inject endpoints into the SAME
// instance the store wired in, and the contract package is the one module every side resolves to a
// single copy of. The host owns the wiring; the seam owns the instance. ---
export const store = configureStore({
  reducer: combineSlices(baseApi),
  // baseApi.middleware runs the cache lifecycle: fetching, request deduplication, tag invalidation,
  // and cache eviction. Leave it off the store and injected endpoints still register, but nothing
  // ever fetches.
  middleware: getDefaultMiddleware => getDefaultMiddleware().concat(baseApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
