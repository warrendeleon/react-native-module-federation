// Ambient declaration for the federated import. `listApp/PokedexScreen` is resolved at runtime by
// Module Federation, so TypeScript has no file to look at; this tells it the shape of the module.
declare module 'listApp/PokedexScreen' {
  import type React from 'react';
  const PokedexScreen: React.ComponentType;
  export default PokedexScreen;
}

declare module 'profileApp/ProfileScreen' {
  import type React from 'react';
  const ProfileScreen: React.ComponentType;
  export default ProfileScreen;
}
