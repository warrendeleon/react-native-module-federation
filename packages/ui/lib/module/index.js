"use strict";

// --- The library's public surface. Three buckets:
//
// 1. Design tokens: the colour scale, the per-type colour map and the literal class helpers.
//    NativeWind reads the same values from tailwind.preset.js; runtime code reads them here.
// 2. Pokédex-domain components, composed entirely from the gluestack-ui primitives below.
//    No raw React Native widgets, no inline colour: every colour is a token class.
// 3. The primitives and the provider. Consumer apps wrap their root in GluestackUIProvider
//    once, in the host; every remote then renders against that one provider through the
//    shared singleton. ---

export * from "./components/index.js";
export * from "./primitives.js";
export * from "./tokens/index.js";
export { GluestackUIProvider } from "./components/ui/gluestack-ui-provider/index.js";
//# sourceMappingURL=index.js.map