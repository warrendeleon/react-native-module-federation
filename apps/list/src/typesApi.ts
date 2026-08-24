import { gql, request } from 'graphql-request';
import { z } from 'zod';
import { baseApi } from '@pokedex/contracts';

const GRAPHQL_URL = 'https://graphql.pokeapi.co/v1beta2';

// The v1beta2 schema dropped the pokemon_v2_ prefix every pre-2025 tutorial uses. The unprefixed
// shape here is the one the live endpoint answers; pokemon_v2_pokemon returns field-not-found.
// The query states its whole demand: the Kanto ids, bounded and ordered, rather than trusting
// the server's default row order to happen to be ascending.
const POKEMON_TYPES = gql`
  {
    pokemon(limit: 151, where: { id: { _lte: 151 } }, order_by: { id: asc }) {
      id
      pokemontypes {
        type {
          name
        }
      }
    }
  }
`;

// Same Zod treatment the REST list gets in the contract package, applied to a different protocol.
// The schema lives here rather than in contracts because it describes Pokédex data, and a data
// definition travels with the domain that owns it.
const PokemonTypesResponseSchema = z.object({
  pokemon: z.array(
    z.object({
      // The same boundaries the REST parsers hold: a positive safe-integer id and
      // non-blank type names, so a malformed row dies here rather than rendering.
      id: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER),
      pokemontypes: z.array(z.object({ type: z.object({ name: z.string().trim().min(1) }) })),
    }),
  ),
});

function formatType(name: string): string {
  return name.charAt(0).toUpperCase() + name.slice(1);
}

export function parsePokemonTypes(raw: unknown): Record<number, string[]> {
  const { pokemon } = PokemonTypesResponseSchema.parse(raw);
  const byId: Record<number, string[]> = {};
  for (const entry of pokemon) {
    byId[entry.id] = entry.pokemontypes.map(t => formatType(t.type.name));
  }
  return byId;
}

// --- A second protocol in the same api slice. An api has exactly one baseQuery, and this app's is
// fetchBaseQuery on the REST base, so the GraphQL call does not come from a second baseQuery: it
// comes from a queryFn, which RTK's docs describe as an inline baseQuery for one-off queries
// against a different base URL. The endpoint injects into the same shared baseApi as the REST list
// and provides the same tag, so one cache and one tag graph cover both protocols. ---
const typesApi = baseApi.injectEndpoints({
  endpoints: build => ({
    getPokemonTypes: build.query<Record<number, string[]>, void>({
      async queryFn() {
        try {
          const raw = await request(GRAPHQL_URL, POKEMON_TYPES);
          return { data: parsePokemonTypes(raw) };
        } catch (err) {
          return {
            error: {
              status: 'CUSTOM_ERROR',
              error: err instanceof Error ? err.message : 'Invalid GraphQL response',
            },
          };
        }
      },
      providesTags: ['PokemonList'],
    }),
  }),
});

export const { useGetPokemonTypesQuery } = typesApi;
