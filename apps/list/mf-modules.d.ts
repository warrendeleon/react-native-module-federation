// This remote is now a consumer too, so it needs the same ambient declaration a host needs.
// `detailApp/PokemonDetailScreen` is resolved at runtime by Module Federation and has no file for
// TypeScript to look at. The difference from a hand-written guess is where the shape comes from:
// @pokedex/contracts, the same package the detail remote was built against.
declare module 'detailApp/PokemonDetailScreen' {
  import type { PokemonDetailScreenModule } from '@pokedex/contracts';
  const PokemonDetailScreen: PokemonDetailScreenModule;
  export default PokemonDetailScreen;
}
