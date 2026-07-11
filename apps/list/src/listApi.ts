import { baseApi, parsePokemonList, type PokemonSummary } from '@pokedex/contracts';

// --- listApp injects its endpoint into the host's shared baseApi at load. This is the RTK Query
// federation proof: the endpoint and its generated hook register against the one shared cache the
// host store already runs, so the data is fetched once, deduped, and reusable by any other remote
// against the same cache. The shell knew nothing about this endpoint when it shipped; the remote
// adds it to the shared API at runtime. ---
const listApi = baseApi.injectEndpoints({
  endpoints: build => ({
    getPokemonList: build.query<PokemonSummary[], void>({
      // One request for the whole Kanto dex. parsePokemonList validates the payload with Zod at the
      // seam and shapes it into rows; a malformed 200 from PokéAPI becomes a query error the screen
      // can show, not a crash three layers away.
      async queryFn(_arg, _api, _extra, baseQuery) {
        const res = await baseQuery('pokemon?limit=151');
        if (res.error) {
          return { error: res.error };
        }
        try {
          return { data: parsePokemonList(res.data) };
        } catch (err) {
          return {
            error: {
              status: 'CUSTOM_ERROR',
              error: err instanceof Error ? err.message : 'Invalid PokéAPI response',
            },
          };
        }
      },
      providesTags: ['PokemonList'],
    }),
  }),
});

export const { useGetPokemonListQuery } = listApi;
