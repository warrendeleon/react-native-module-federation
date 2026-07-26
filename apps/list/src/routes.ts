import type { DetailParamList } from '@pokedex/contracts';

// This stack's routes. PokedexList is local business and stays here. PokemonDetail is not declared
// here at all: it comes from the contract, so the params this remote pushes are typed by the same
// definition the detail remote reads them back with.
export type ListParamList = DetailParamList & {
  PokedexList: undefined;
};
