// The one agreement three separately-built apps have to share: what it takes to open a Pokémon
// detail. The list pushes it, the party pushes it, the detail remote reads it back. None of the
// three can own the definition, because the other two would then depend on that app's source.

export interface DetailParams {
  id: number;
}

// A ParamList fragment rather than a whole ParamList. Each stack has its own routes and embeds this
// one, so the detail route is typed identically everywhere it appears without the package having to
// know what else lives in that stack.
export type DetailParamList = {
  PokemonDetail: DetailParams;
};
