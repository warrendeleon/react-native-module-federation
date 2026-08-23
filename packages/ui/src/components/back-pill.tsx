import React from 'react';
import { Image, type StyleProp, type ViewStyle } from 'react-native';
import { useColorScheme } from 'nativewind';

import { colours } from '../tokens/colours';
import { Pressable } from './ui/pressable';

// --- The floating back control for full-bleed screens. A headerless route has no navigation
// bar to put a back button in, so the control floats over the content — and because it floats,
// it has to carry its own surface on every background it can land on: a pastel hero at rest,
// the scheme surface once the compact bar is up. A chevron, not a cross: the screen arrives as
// a push, and the affordance should say "back", not "dismiss".
//
// Positioning stays with the caller (safe-area insets are the screen's business); this
// component owns the look so every consumer floats the same pill. ---

export interface BackPillProps {
  onPress: () => void;
  /** Defaults to "Go back". */
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

export function BackPill({ onPress, accessibilityLabel = 'Go back', style }: BackPillProps) {
  const { colorScheme } = useColorScheme();
  const dark = colorScheme === 'dark';
  return (
    <Pressable
      onPress={onPress}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      className={
        dark
          ? // A dark scrim, not a light wash: the pill can sit over the pastel hero or the navy
            // compact bar, and black/35 + a white glyph clears 3:1 on both. A white wash only
            // managed it on the navy.
            'h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-black/35 active:opacity-60'
          : 'h-9 w-9 items-center justify-center rounded-full border border-black/10 bg-white shadow-sm shadow-black/20 active:opacity-60'
      }
      style={style}>
      <Image
        source={require('../assets/chevron-left.png')}
        style={{
          width: 20,
          height: 20,
          marginLeft: -2,
          tintColor: dark ? colours.white : colours.darkGrey,
        }}
        resizeMode="contain"
      />
    </Pressable>
  );
}
