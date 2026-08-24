import { baseApi, parsePokemonDetail, type PokemonDetail } from '@pokedex/contracts';

// --- The Pokédex domain's second endpoint. Pokémon data belongs to this domain, so its definitions
// live here — the installed detail view stays a pure component and is fed by the container below in
// ListStack. No tags — nothing invalidates a single Pokémon yet. ---
const detailApi = baseApi.injectEndpoints({
  // Both tab remotes define this endpoint against the shared api: each domain owns its data
  // access, and the definitions are identical by construction because both parse with the
  // contracts schema. Be exact about what this flag changes. Without it RTK keeps the FIRST
  // injection and skips the second, logging an error in dev; with it, the LAST injection wins.
  // Either way load order decides, which neither app controls, so the two definitions have to
  // stay identical rather than merely similar.
  overrideExisting: true,
  endpoints: build => ({
    getPokemonDetail: build.query<PokemonDetail, number>({
      // One Pokémon by id. parsePokemonDetail validates the payload with Zod at the seam and keeps
      // only what the screen renders; the full PokéAPI payload is enormous.
      async queryFn(id, _api, _extra, baseQuery) {
        const res = await baseQuery(`pokemon/${id}`);
        if (res.error) {
          return { error: res.error };
        }
        try {
          return { data: parsePokemonDetail(res.data) };
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
