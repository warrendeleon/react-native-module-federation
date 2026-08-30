import React from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import { useColorScheme } from 'nativewind';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import type { PokemonDetail } from '@pokedex/contracts';
import {
  bgClassForType,
  borderClassForType,
  textOnTypeClass,
  Box,
  Button,
  ButtonText,
  ErrorState,
  Heading,
  HStack,
  Image,
  InfoRow,
  LoadingState,
  ScreenContainer,
  StatBar,
  colours,
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
// shared @pokedex/ui singleton, and the layout is the full detail design: a full-bleed hero that
// runs under the status bar and parallaxes as the sheet of cards scrolls over it, a compact title
// that fades in once the name has scrolled away, the Pokédex entry, Info rows, Base Stats bars.
// The props seam is unchanged from 3.x, which is why both containers survive this major with
// nothing but a version bump.
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

const HERO_HEIGHT = 380;
const COMPACT_BAR = 52;

export default function PokemonDetailView({
  pokemon,
  loading,
  error,
  onRetry,
  onAddToParty,
  addDisabled,
  addLabel,
}: PokemonDetailViewProps) {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const { colorScheme } = useColorScheme();
  const surface = colorScheme === 'dark' ? colours.navy : colours.offWhite;
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler(event => {
    scrollY.value = event.contentOffset.y;
  });

  // The hero lags the sheet (parallax) and stretches on overscroll; the compact title bar fades
  // in as the name scrolls out from under it. All on the UI thread.
  const heroStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: interpolate(scrollY.value, [-240, 0, HERO_HEIGHT], [-120, 0, HERO_HEIGHT * 0.3], Extrapolation.CLAMP),
      },
      { scale: interpolate(scrollY.value, [-240, 0], [1.3, 1], Extrapolation.CLAMP) },
    ],
  }));
  const compactStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      scrollY.value,
      [HERO_HEIGHT - 24 - COMPACT_BAR - 60, HERO_HEIGHT - 24 - COMPACT_BAR],
      [0, 1],
      Extrapolation.CLAMP,
    ),
  }));
  const ghostStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, 80], [1, 0], Extrapolation.CLAMP),
  }));

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
  const dexNumber = `#${String(pokemon.id).padStart(3, '0')}`;
  const topInset = insets.top;
  // The hero is painted in the type's own colour, and that colour runs from pale (grass, fairy)
  // to nearly black (fighting, dark). Its text cannot be a fixed colour: the design
  // system already decided per type, once, from perceived luminance, so the hero asks the token
  // rather than assuming. Hard-coded black put "Mankey" at 1.7:1 on the fighting hero.
  const onHero = textOnTypeClass(primary);
  const heroInk = onHero === 'text-white';
  // The dex number used to mute itself to text-black/60 or text-white/70. That invented a second
  // answer one line under the comment above, and text-black resolves to #2E3138 here, the value
  // the preset warns is not a foreground. It measured 2.21:1 on water and failed sixteen of the
  // eighteen fills. No alpha clears all of them, so the line asks the same token the name does.
  const ghostInk = heroInk ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)';

  return (
    <ScreenContainer edges={[]}>
      {/* The hero sits behind the scroll view and runs under the status bar. */}
      <Animated.View style={[styles.hero, { height: HERO_HEIGHT + topInset }, heroStyle]}>
        <Box className={`flex-1 ${bgClassForType(primary)}`}>
          {/* Depth without a gradient: the dex number as a large ghost numeral behind the
              sprite, fading as the sheet arrives. */}
          {/* Decoration only: the spoken dex number lives on the visible label below, so the
              ghost stays out of the accessibility tree on both platforms. */}
          <Animated.View
            style={[styles.ghostWrap, { top: topInset + 28 }, ghostStyle]}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants">
            <Text style={[styles.ghostNumeral, { color: ghostInk }]}>{dexNumber}</Text>
          </Animated.View>
          <VStack space="lg" className="flex-1 items-center justify-end pb-9" style={{ paddingTop: topInset }}>
            <Box className="rounded-full border-2 border-white/50 bg-white/35 p-5">
              {/* The name is announced by the heading one element later; an alt here would
                  read it twice in a row. */}
              <Image
                source={{ uri: pokemon.spriteUri }}
                alt=""
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
                size="xl"
                resizeMode="contain"
              />
            </Box>
            <VStack space="xs" className="items-center">
              <Heading size="2xl" className={onHero}>
                {pokemon.name}
              </Heading>
              <Text size="sm" className={`font-head ${onHero}`}>
                {dexNumber}
              </Text>
            </VStack>
            <HStack space="sm">
              {pokemon.types.map(type => (
                <TypeBadge key={type} type={type} size="md" surface="hero" />
              ))}
            </HStack>
          </VStack>
        </Box>
      </Animated.View>

      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: HERO_HEIGHT + topInset - 24 }}>
        {/* The sheet: rounded top edge over the hero, the surface colour of the scheme. Its
            minimum height is the viewport below the compact bar, so the sheet can always travel
            up to the bar and the hero collapses fully, with no dead space past the content. */}
        <Box
          className="rounded-t-3xl bg-offWhite dark:bg-navy"
          style={{ minHeight: windowHeight - topInset - COMPACT_BAR + 24 }}>
          <VStack space="2xl" className="flex-1 px-4 pb-12 pt-6">
            {pokemon.flavourText ? (
              <Box
                className={`rounded-2xl border-l-4 bg-white p-4 shadow-sm shadow-black/10 dark:border dark:border-l-4 dark:border-white/10 dark:bg-black ${borderClassForType(primary)}`}>
                <Text size="sm" className="italic leading-6 text-darkGrey dark:text-lightGrey">
                  {pokemon.flavourText}
                </Text>
              </Box>
            ) : null}

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
                {pokemon.stats.map((stat, index) => (
                  <StatBar
                    key={stat.name}
                    label={STAT_LABELS[stat.name] ?? stat.name}
                    value={stat.value}
                    colourType={primary}
                    index={index}
                  />
                ))}
              </Box>
            </VStack>

            {onAddToParty ? (
              // The one primary action on the screen wears the type colour at full strength —
              // the same colour the accent foot and the hero already speak — with the pale grey
              // kept for the genuinely disabled "party is full" state. mt-auto anchors it to the
              // sheet's bottom edge, so the air the sheet's minimum height creates sits between
              // the stats and the button instead of dangling below it.
              <Button
                onPress={onAddToParty}
                disabled={addDisabled}
                size="lg"
                className={`mt-auto rounded-xl ${
                  addDisabled
                    ? 'bg-lightGrey dark:bg-white/10'
                    : bgClassForType(primary)
                }`}
                // The 44pt bar is declared here rather than inherited from the size variant.
                // A variant is a visual decision that can change; the minimum tappable size of
                // the screen's one primary action is a commitment, and the accessibility suite
                // can only verify what the control actually declares. `alignSelf: 'stretch'`
                // makes the button far wider than 44, but stretch is a layout instruction, not
                // a measurement, so the minimum is stated on both axes.
                style={{ alignSelf: 'stretch', minWidth: 44, minHeight: 44 }}
                accessibilityRole="button">
                <ButtonText
                  className={addDisabled ? 'text-midGrey' : textOnTypeClass(primary)}>
                  {addLabel ?? 'Add to party'}
                </ButtonText>
              </Button>
            ) : null}
          </VStack>
        </Box>
      </Animated.ScrollView>

      {/* Compact title: appears once the hero's name has scrolled away. */}
      <Animated.View
        pointerEvents="none"
        // A visual echo of the hero's heading for sighted users mid-scroll; assistive tech
        // already has the name once.
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={[
          styles.compact,
          { height: topInset + COMPACT_BAR, paddingTop: topInset, backgroundColor: surface },
          compactStyle,
        ]}>
        <Box className="h-full items-center justify-center border-b border-lightGrey/60 dark:border-white/10">
          <Text size="md" className="font-head text-black dark:text-white">
            {pokemon.name}
          </Text>
        </Box>
      </Animated.View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  hero: { position: 'absolute', top: 0, left: 0, right: 0 },
  ghostWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  ghostNumeral: {
    fontFamily: 'Nunito-ExtraBold',
    fontSize: 132,
    lineHeight: 140,
    color: 'rgba(0,0,0,0.08)',
  },
  compact: { position: 'absolute', top: 0, left: 0, right: 0 },
});
