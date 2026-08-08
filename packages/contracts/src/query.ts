import { QueryClient } from '@tanstack/react-query';

// --- The single QueryClient for the whole federation, and the reason it lives here rather than in
// the host: every consumer has to read and write the SAME cache, and @pokedex/contracts is the one
// module Module Federation resolves to a single copy. The host passes this instance to
// QueryClientProvider; a remote shipped months later calls useQuery and lands in that cache without
// registering anything first. Nothing is injected, because there is nothing to inject into: a query
// exists the moment a component asks for it. ---
export const queryClient = new QueryClient();

// --- The key factory. TanStack has no central API object, so the only thing two teams can agree on
// is the shape of the key, and agreement by convention is agreement that can drift. Exporting the
// factory from the contract makes the prefix the promise: anything under ['pokemon'] is refetched
// by one invalidateQueries call, and a rename here is a version bump every consumer sees, not a
// string someone changed in a bundle nobody rebuilt. ---
export const pokemonKeys = {
  all: ['pokemon'] as const,
  list: () => [...pokemonKeys.all, 'list'] as const,
  detail: (id: number) => [...pokemonKeys.all, 'detail', id] as const,
};
