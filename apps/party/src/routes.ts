import type { DetailParamList } from '@pokedex/contracts';

// The party's own routes, plus the same PokemonDetail fragment the list stack embeds. Two stacks
// built in two apps, one definition of what opening a detail takes.
export type PartyParamList = DetailParamList & {
  PartyMain: undefined;
};
