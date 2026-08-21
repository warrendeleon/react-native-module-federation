// --- Re-export of the underlying gluestack-ui primitives. The design system is the single
// import surface for the whole federation: apps use the Pokédex-domain components for the
// common cases and these primitives for custom layouts, all resolved from the host's shared
// @pokedex/ui singleton so every remote renders against the same provider and the same
// styling runtime. Trimmed to what the companion's screens actually compose. ---

export { Box } from './components/ui/box';
export { Button, ButtonText } from './components/ui/button';
export { Card } from './components/ui/card';
export { Center } from './components/ui/center';
export { Heading } from './components/ui/heading';
export { HStack } from './components/ui/hstack';
export { Image } from './components/ui/image';
export { Pressable } from './components/ui/pressable';
export { SafeAreaView } from './components/ui/safe-area-view';
export { Spinner } from './components/ui/spinner';
export { Text } from './components/ui/text';
export { VStack } from './components/ui/vstack';
