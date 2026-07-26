// Ambient declarations for the federated imports. `listApp/ListStack` and `partyApp/PartyStack` are
// resolved at runtime by Module Federation, so TypeScript has no file to look at.
//
// What changed in this post is not the declarations but where their shape comes from. They used to
// spell out `React.ComponentType` right here: a guess the compiler believed and nothing checked
// against the module the remote actually ships. They now point at @pokedex/contracts, which the
// remotes were built against too.
declare module 'listApp/ListStack' {
  import type { ListStackModule } from '@pokedex/contracts';
  const ListStack: ListStackModule;
  export default ListStack;
}

declare module 'partyApp/PartyStack' {
  import type { PartyStackModule } from '@pokedex/contracts';
  const PartyStack: PartyStackModule;
  export default PartyStack;
}
