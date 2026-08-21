import React from 'react';
import { ScrollView } from 'react-native';
import type { PokemonDetail } from '@pokedex/contracts';
import {
  bgClassForType,
  Box,
  Button,
  ButtonText,
  Center,
  ErrorState,
  Heading,
  HStack,
  Image,
  InfoRow,
  LoadingState,
  ScreenContainer,
  StatBar,
  Text,
  TypeBadge,
  VStack,
} from '@pokedex/ui';

// This is a view: it renders what it is handed and reports what is pressed. Where the data comes
// from is the consumer's business; each app composes this view with its own data in its own
// container route. The add-to-party props stay optional for the same reason: a write that crosses
// a domain boundary is wired by the consumer, so this view holds no action creator and no store
// import.
//
// 4.0.0 dresses the view in the design system: every colour is a token class resolved from the
// shared @pokedex/ui singleton, and the layout is the full detail design (type-tinted hero, Info
// rows, Base Stats bars). The props seam is unchanged from 3.x, which is why both containers
// survive this major with nothing but a version bump.
export interface PokemonDetailViewProps {
  pokemon?: PokemonDetail;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  onAddToParty?: () => void;
  addDisabled?: boolean;
  addLabel?: string;
}

// PokéAPI stat identifiers to display labels. A literal map, like the type-class maps in
// @pokedex/ui: the screen prints what it knows and falls back to the raw name for anything new.
const STAT_LABELS: Record<string, string> = {
  hp: 'HP',
  attack: 'Attack',
  defense: 'Defence',
  'special-attack': 'Sp. Atk',
  'special-defense': 'Sp. Def',
  speed: 'Speed',
};

export default function PokemonDetailView({
  pokemon,
  loading,
  error,
  onRetry,
  onAddToParty,
  addDisabled,
  addLabel,
}: PokemonDetailViewProps) {
  if (loading) {
    return (
      <ScreenContainer edges={[]}>
        <LoadingState caption="Loading Pokémon…" />
      </ScreenContainer>
    );
  }

  if (error || !pokemon) {
    return (
      <ScreenContainer edges={[]}>
        <ErrorState message="Couldn't reach PokéAPI." onRetry={onRetry} retryLabel="Try again" />
      </ScreenContainer>
    );
  }

  const primary = pokemon.types[0] ?? 'normal';

  return (
    <ScreenContainer edges={[]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <VStack space="2xl">
          <Center className={`py-8 ${bgClassForType(primary)}`}>
            <VStack space="lg" className="items-center">
              <Box className="rounded-full bg-white/25 p-5">
                <Image
                  source={{ uri: pokemon.spriteUri }}
                  alt={pokemon.name}
                  size="xl"
                  resizeMode="contain"
                />
              </Box>
              <VStack space="xs" className="items-center">
                <Heading size="2xl" className="text-black">
                  {pokemon.name}
                </Heading>
                <Text size="sm" bold className="text-black/60">
                  #{String(pokemon.id).padStart(3, '0')}
                </Text>
              </VStack>
              <HStack space="sm">
                {pokemon.types.map(type => (
                  <TypeBadge key={type} type={type} size="md" surface="hero" />
                ))}
              </HStack>
            </VStack>
          </Center>

          <VStack space="2xl" className="px-4 pb-10">
            <VStack space="sm">
              <Text size="xs" bold className="uppercase tracking-widest text-midGrey">
                Info
              </Text>
              <Box className="rounded-2xl bg-white px-4 shadow-sm shadow-black/10 dark:border dark:border-white/10 dark:bg-black">
                <InfoRow label="Height" value={`${pokemon.heightM.toFixed(1)} m`} />
                <InfoRow label="Weight" value={`${pokemon.weightKg.toFixed(1)} kg`} />
                <InfoRow label="Abilities" value={pokemon.abilities.join(', ')} last />
              </Box>
            </VStack>

            <VStack space="sm">
              <Text size="xs" bold className="uppercase tracking-widest text-midGrey">
                Base Stats
              </Text>
              <Box className="rounded-2xl bg-white px-4 py-1.5 shadow-sm shadow-black/10 dark:border dark:border-white/10 dark:bg-black">
                {pokemon.stats.map(stat => (
                  <StatBar
                    key={stat.name}
                    label={STAT_LABELS[stat.name] ?? stat.name}
                    value={stat.value}
                    colourType={primary}
                  />
                ))}
              </Box>
            </VStack>

            {onAddToParty ? (
              <Button
                onPress={onAddToParty}
                disabled={addDisabled}
                size="lg"
                className={`rounded-xl ${addDisabled ? 'bg-lightGrey' : 'bg-pokemonGreen'}`}
                style={{ alignSelf: 'stretch' }}
                accessibilityRole="button"
              >
                <ButtonText className={addDisabled ? 'text-midGrey' : 'text-black'}>
                  {addLabel ?? 'Add to party'}
                </ButtonText>
              </Button>
            ) : null}

            <Box className="items-center">
              <Text size="xs" className="text-midGrey/70">
                Served by @pokedex/detail
              </Text>
            </Box>
          </VStack>
        </VStack>
      </ScrollView>
    </ScreenContainer>
  );
}
