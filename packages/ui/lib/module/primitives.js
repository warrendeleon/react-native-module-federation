"use strict";

// --- Re-export of the underlying gluestack-ui primitives. The design system is the single
// import surface for the whole federation: apps use the Pokédex-domain components for the
// common cases and these primitives for custom layouts, all resolved from the host's shared
// @pokedex/ui singleton so every remote renders against the same provider and the same
// styling runtime. Trimmed to what the companion's screens actually compose. ---

export { Box } from "./components/ui/box/index.js";
export { Button, ButtonText } from "./components/ui/button/index.js";
export { Card } from "./components/ui/card/index.js";
export { Center } from "./components/ui/center/index.js";
export { Heading } from "./components/ui/heading/index.js";
export { HStack } from "./components/ui/hstack/index.js";
export { Image } from "./components/ui/image/index.js";
export { Pressable } from "./components/ui/pressable/index.js";
export { SafeAreaView } from "./components/ui/safe-area-view/index.js";
export { Spinner } from "./components/ui/spinner/index.js";
export { Text } from "./components/ui/text/index.js";
export { VStack } from "./components/ui/vstack/index.js";
//# sourceMappingURL=primitives.js.map