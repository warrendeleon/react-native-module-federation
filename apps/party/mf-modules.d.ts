// The same declaration the list remote writes, in a different app that has never seen it. Both
// point at @pokedex/contracts, so both describe the detail screen the same way whether or not the
// two teams ever talk.
declare module 'detailApp/PokemonDetailScreen' {
  import type { PokemonDetailScreenModule } from '@pokedex/contracts';
  const PokemonDetailScreen: PokemonDetailScreenModule;
  export default PokemonDetailScreen;
}
