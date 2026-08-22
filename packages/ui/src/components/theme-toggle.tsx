import React from 'react';
import { Image } from 'react-native';
import { colorScheme as schemeStore, useColorScheme } from 'nativewind';

import { colours } from '../tokens/colours';
import { Pressable } from './ui/pressable';

// --- The theme control. It lives in the design system rather than any app because it holds no
// app state: the colour scheme is module-level state inside the shared styling runtime, this
// component reads it through the same subscription every dark: class uses, and a press writes
// it back. Any surface in the federation can mount it and they all stay in step. Icon-only,
// sized for a navigation bar's right slot. ---

export interface ThemeToggleProps {
  /** Glyph size in points. */
  size?: number;
}

export function ThemeToggle({ size = 22 }: ThemeToggleProps) {
  const { colorScheme } = useColorScheme();
  const dark = colorScheme === 'dark';
  return (
    <Pressable
      onPress={() => schemeStore.set(dark ? 'light' : 'dark')}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="active:opacity-60">
      <Image
        source={dark ? require('../assets/sun.png') : require('../assets/moon.png')}
        style={{ width: size, height: size, tintColor: dark ? colours.lightGrey : colours.darkGrey }}
        resizeMode="contain"
      />
    </Pressable>
  );
}
