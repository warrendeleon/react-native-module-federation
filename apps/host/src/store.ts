import { configureStore } from '@reduxjs/toolkit';
import { baseApi, rootReducer } from '@pokedex/contracts';

// --- The host store. The store lives here, in the shell — but both things it is built around live
// in @pokedex/contracts: the api instance, because every consumer injects endpoints into the SAME
// instance the store wired in, and now the reducer, because a remote that grows the store at
// runtime must inject its slice into the SAME reducer object. The host owns the wiring; the seam
// owns the instance and the reducer. ---
export const store = configureStore({
  reducer: rootReducer,
  // baseApi.middleware runs the cache lifecycle: fetching, request deduplication, tag invalidation,
  // and cache eviction. Leave it off the store and injected endpoints still register, but nothing
  // ever fetches.
  middleware: getDefaultMiddleware => getDefaultMiddleware().concat(baseApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
