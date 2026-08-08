import { useQuery } from '@tanstack/react-query';
import { parsePokemonDetail, pokemonKeys, type PokemonDetail } from '@pokedex/contracts';

// --- The Pokédex domain's second query. Pokémon data belongs to this domain, so the fetch and the
// hook live here; the installed detail view stays a pure component, fed by the container in
// ListStack. ---
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
