import { useQuery } from '@tanstack/react-query';
import { parsePokemonDetail, pokemonKeys, type PokemonDetail } from '@pokedex/contracts';

// --- The party's own copy of the detail query, written rather than imported. The list app has an
// identical one, and this app cannot import it: apps depend on contracts, never on each other. A
// shared data package would remove the duplication at the price of coupling two teams' release
// cycles, so the twenty lines are duplicated on purpose.
//
// The KEY is the same on both sides, and that is deliberate. Two apps calling useQuery with
// pokemonKeys.detail(25) are looking at one cache entry, because TanStack compares keys by value:
// open Pikachu in the Pokédex, then open it again from the party, and the second screen renders
// from cache without a request. Nothing is registered and nothing collides — whichever queryFn
// mounts first is the one that runs, and the other is never consulted for that entry. Identical
// definitions make that harmless. Drifted definitions would make it a bug that appears only in
// whichever order the user happens to open the screens. ---
async function fetchPokemonDetail(id: number): Promise<PokemonDetail> {
  const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
  if (!res.ok) {
    throw new Error(`PokéAPI responded ${res.status}`);
  }
  return parsePokemonDetail(await res.json());
}

export function usePokemonDetail(id: number) {
  return useQuery({
    queryKey: pokemonKeys.detail(id),
    queryFn: () => fetchPokemonDetail(id),
  });
}
