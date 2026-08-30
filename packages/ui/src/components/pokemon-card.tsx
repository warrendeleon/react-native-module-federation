import React from 'react';
import { type ImageSourcePropType } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { bgClassForType, tintBgClassForType } from '../tokens/typeColours';

import { Box } from './ui/box';
import { Card } from './ui/card';
import { Image } from './ui/image';
import { Pressable } from './ui/pressable';
import { Text } from './ui/text';
import { TypeBadge } from './type-badge';

// --- The Pokédex grid's primary card. White rounded background, hashed ID, circular tinted
// sprite area (background tint is the primary type's colour at 30% opacity so the sprite
// stays the focal point), name in semibold, type badges in a row at the bottom. Tapping the
// card runs onPress; what the press navigates to is the consumer's business.
//
// Composed from Gluestack primitives only: Pressable wraps Card; the sprite background is a
// Box with a tint-class from the token preset; the sprite itself is Gluestack Image; name +
// ID are Text; type pills are TypeBadge (which composes Box + Text). Styling is class-based
// throughout; the one style object is the animated press spring, which has to be a style
// because Reanimated drives it per frame. ---

export interface PokemonCardProps {
  id: number;
  name: string;
  types: string[];
  spriteUri?: string;
  spriteSource?: ImageSourcePropType;
  onPress?: () => void;
  /** When set, a remove (✕) badge is shown in the corner; tapping it runs this, not onPress. */
  onRemove?: () => void;
}

function PokemonCardInner({
  id,
  name,
  types,
  spriteUri,
  spriteSource,
  onPress,
  onRemove,
}: PokemonCardProps) {
  // Press feedback as a real spring rather than a static transform: the scale eases down on
  // touch and springs back on release, on the UI thread.
  const pressed = useSharedValue(0);
  const springStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(pressed.value ? 0.96 : 1, { damping: 18, stiffness: 320 }) }],
  }));
  const primaryType = types[0] ?? 'normal';
  const tintBg = tintBgClassForType(primaryType);
  const accent = bgClassForType(primaryType);
  const paddedId = String(id).padStart(3, '0');
  const idLabel = `#${paddedId}`;
  const source: ImageSourcePropType | undefined =
    spriteSource ?? (spriteUri ? { uri: spriteUri } : undefined);

  // The whole card is one accessible button, so a screen reader announces this name rather than
  // the concatenated child text. Remove is a custom action on that same element, not a nested
  // button: a Pressable sets accessible=true, which on iOS collapses its descendants, so a child
  // button would be unreachable to VoiceOver. The visual ✕ stays for sighted users but is taken
  // out of the a11y tree (the action covers screen-reader users) with a hitSlop-enlarged target.
  // When type loading has degraded the caller hands an empty array; the label then stops at
  // the number instead of announcing a dangling ", type" with nothing in front of it.
  const a11yLabel =
    types.length > 0
      ? `${name}, number ${paddedId}, ${types.join(' and ')} ${types.length > 1 ? 'types' : 'type'}`
      : `${name}, number ${paddedId}`;

  return (
    <Pressable
      onPress={onPress}
      // A card with no press and no remove is information, not a control; announcing
      // "button" on it promises an activation that does nothing.
      accessibilityRole={onPress || onRemove ? 'button' : undefined}
      accessibilityLabel={a11yLabel}
      accessibilityHint={onPress ? 'Opens details' : undefined}
      accessibilityActions={onRemove ? [{ name: 'remove', label: 'Remove from party' }] : undefined}
      onAccessibilityAction={
        onRemove
          ? event => {
              if (event.nativeEvent.actionName === 'remove') onRemove();
            }
          : undefined
      }
      className="active:opacity-90"
      onPressIn={() => {
        pressed.value = 1;
      }}
      onPressOut={() => {
        pressed.value = 0;
      }}
    >
      <Animated.View style={springStyle}>
      <Card className="items-center overflow-hidden rounded-2xl bg-white p-3 pb-4 shadow-sm shadow-black/10 dark:border dark:border-white/10 dark:bg-black">
        {onRemove ? (
          <Pressable
            onPress={onRemove}
            accessible={false}
            importantForAccessibility="no-hide-descendants"
            accessibilityElementsHidden
            // h-6 is 1.5rem, and NativeWind's rem on React Native is 14, so the painted badge is
            // 21pt. With hitSlop 10 the target was 41pt, under the 44 the rest of this package
            // holds itself to. 12 takes it to 45. The badge is hidden from screen readers because
            // removal is exposed as an accessibility action on the card; it is still a target for
            // everyone else.
            hitSlop={12}
            className="absolute right-1.5 top-1.5 z-10 h-6 w-6 items-center justify-center rounded-full bg-red active:opacity-70"
          >
            <Text size="xs" bold className="text-white">
              ✕
            </Text>
          </Pressable>
        ) : null}
        <Box className="mb-1 self-start rounded-md bg-offGrey px-1.5 py-0.5 dark:bg-white/10">
          <Text size="xs" className="text-midGrey">
            {idLabel}
          </Text>
        </Box>
        <Box className={`mb-2 h-16 w-16 items-center justify-center rounded-full ${tintBg}`}>
          {source ? (
            <Image source={source} resizeMode="contain" className="h-12 w-12" alt={name} />
          ) : null}
        </Box>
        <Text size="md" className="mb-1.5 text-center font-head text-black dark:text-white">
          {name}
        </Text>
        {/* One fixed-height badge row: dual-type and single-type cards stay the same height, so
            a three-column grid keeps its rows aligned. Two xs pills fit side by side. */}
        <Box className="h-5 flex-row justify-center gap-1 overflow-hidden">
          {types.slice(0, 2).map(t => (
            <TypeBadge key={t} type={t} size="xs" />
          ))}
        </Box>
        {/* The type's colour as a hairline at the card's foot: the grid reads its types at a
            glance, and the card gets a face of its own. */}
        {/* dark:opacity-60 pulls the foot back with the tonal badges: the type stays legible
            without being the loudest thing on a dark card. */}
        <Box className={`absolute bottom-0 left-0 right-0 h-1.5 dark:opacity-60 ${accent}`} />
      </Card>
      </Animated.View>
    </Pressable>
  );
}

// Memoised: in a long grid the card's props are stable row to row, and its theme-dependent
// classes update through the styling runtime rather than a React re-render. The memo only
// pays off when the consumer keeps its callback props stable too (useCallback in the grid
// screens); a fresh onPress per parent render would defeat it row by row.
export const PokemonCard = React.memo(PokemonCardInner);
