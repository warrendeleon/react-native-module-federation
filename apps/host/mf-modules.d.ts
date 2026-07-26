// Ambient declarations for the federated imports. `listApp/PokedexScreen` and
// `partyApp/PartyScreen` are resolved at runtime by Module Federation, so TypeScript has no file to
// look at; these tell it the shape of each module.
declare module 'listApp/PokedexScreen' {
  import type React from 'react';
  const PokedexScreen: React.ComponentType;
  export default PokedexScreen;
}

declare module 'partyApp/PartyScreen' {
  import type React from 'react';
  const PartyScreen: React.ComponentType;
  export default PartyScreen;
}
