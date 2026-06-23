// Ambient declarations for the federated imports. `listApp/PokedexScreen` is resolved at runtime by
// Module Federation, so TypeScript has no file to look at. Instead of hand-writing the shape here
// (a guess nothing checks against the remote), each declaration borrows its type from
// @pokedex/contracts, the same source the remote builds against.
declare module 'listApp/PokedexScreen' {
  import type { PokedexScreenModule } from '@pokedex/contracts';
  const PokedexScreen: PokedexScreenModule;
  export default PokedexScreen;
}

declare module 'profileApp/ProfileScreen' {
  import type { ProfileScreenModule } from '@pokedex/contracts';
  const ProfileScreen: ProfileScreenModule;
  export default ProfileScreen;
}
