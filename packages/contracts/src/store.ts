import { combineSlices } from '@reduxjs/toolkit';
import { baseApi } from './api';

// --- The store's reducer lives at the seam for the same reason baseApi does: a remote that grows
// the store at runtime must inject into the SAME reducer object the host wired in, and the
// contract package is the one module every side resolves to a single copy of. combineSlices
// returns a reducer with an `inject` method; a slice owner calls rootReducer.inject(slice) and
// the running store gains a reducer the host never shipped. The host still owns the store — the
// middleware, the Provider, the wiring. The seam owns the reducer the same way it owns the api
// instance. ---
export const rootReducer = combineSlices(baseApi);
