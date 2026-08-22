import { baseApi, parsePokemonDetail, type PokemonDetail } from '@pokedex/contracts';

// --- The party's own copy of getPokemonDetail, written rather than imported. The list app has an
// identical definition, and this app cannot import it: apps depend on contracts, never on each
// other. A shared data package would remove the duplication at the price of coupling two teams'
// release cycles, so the roughly twenty lines are duplicated on purpose.
//
// The endpoint NAME collides on purpose too. Both apps inject `getPokemonDetail` into the one
// baseApi and both declare the collision with overrideExisting, so the last injection wins;
// undeclared, RTK would keep the first and skip this one. Either way load order decides, and
// either way there is one definition and one set of cache entries. Identical definitions make
// that harmless. Drifted definitions would make it a bug, which is why this copy tracks the
// list app's byte for byte. ---
const detailApi = baseApi.injectEndpoints({
  overrideExisting: true,
  endpoints: build => ({
    getPokemonDetail: build.query<PokemonDetail, number>({
      // One Pokémon by id. parsePokemonDetail validates the payload with Zod at the seam and keeps
      // only what the screen renders; the full PokéAPI payload is enormous.
      async queryFn(id, _api, _extra, baseQuery) {
        // Two resources describe one Pokémon: the pokemon payload and its species entry, which
        // carries the Pokédex flavour text. Fetched together; the species is decoration, so its
        // failure degrades to a detail without a quote rather than an error screen.
        const [res, speciesRes] = await Promise.all([
          baseQuery(`pokemon/${id}`),
          baseQuery(`pokemon-species/${id}`),
        ]);
        if (res.error) {
          return { error: res.error };
        }
        try {
          return { data: parsePokemonDetail(res.data, speciesRes.error ? undefined : speciesRes.data) };
        } catch (err) {
          return {
            error: {
              status: 'CUSTOM_ERROR',
              error: err instanceof Error ? err.message : 'Invalid PokéAPI response',
            },
          };
        }
      },
    }),
  }),
});

export const { useGetPokemonDetailQuery } = detailApi;
