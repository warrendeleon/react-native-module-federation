import { useQuery } from '@tanstack/react-query';
import { parsePokemonList, pokemonKeys, type PokemonSummary } from '@pokedex/contracts';

// --- The Pokédex list, read through the shared cache. There is no injection step on this branch
// and nothing to register: useQuery creates the query the first time a component mounts it, in
// whichever bundle that component happens to live. A remote shipped a year after the shell can add
// server state to the running app by calling a hook, which is as federation-friendly as this gets.
//
// What the shell no longer provides is the base URL. On the Redux branch it was configured once on
// the shared api instance; here every queryFn is an ordinary function that fetches whatever it
// likes, so the host has no say in where a remote's data comes from. Convenient for the remote,
// invisible to everyone else. ---
async function fetchPokemonList(): Promise<PokemonSummary[]> {
  const res = await fetch('https://pokeapi.co/api/v2/pokemon?limit=151');
  if (!res.ok) {
    throw new Error(`PokéAPI responded ${res.status}`);
  }
  // parsePokemonList validates the payload with Zod at the seam and shapes it into rows. It throws
  // on a bad shape, and TanStack turns a thrown queryFn into the error state the screen renders.
  // The parser is imported from the contract, unchanged from the Redux branch: the data model is
  // the domain's, not the cache library's.
  return parsePokemonList(await res.json());
}

export function usePokemonList() {
  return useQuery({ queryKey: pokemonKeys.list(), queryFn: fetchPokemonList });
}
