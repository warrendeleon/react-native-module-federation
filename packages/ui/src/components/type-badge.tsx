import React from 'react';

import { badgeDarkClassForType, bgClassForType, textOnTypeClass } from '../tokens/typeColours';

import { Box } from './ui/box';
import { Text } from './ui/text';

// --- Coloured pill that displays a Pokémon type (Fire, Water, etc). Both background and
// text colour come from token classes (bg-type-<name> + text-white/black) defined in the
// shared Tailwind preset. No inline styles; designers can re-skin the whole type palette by
// editing tailwind.preset.js. Composed from Gluestack Box + Text primitives. ---

export interface TypeBadgeProps {
  type: string;
  size?: 'xs' | 'sm' | 'md';
  /**
   * Where the badge sits. On a card it fills with the type colour. On a hero whose background
   * IS the type colour, a solid pill of the same colour would vanish; the hero variant uses a
   * translucent scrim instead, so the pill reads on any type.
   */
  surface?: 'card' | 'hero';
}

export function TypeBadge({ type, size = 'sm', surface = 'card' }: TypeBadgeProps) {
  // On a card the pill dims to a tonal wash in dark mode; the hero variant never does, because
  // the hero surface itself stays the light type tint in both schemes.
  const bg =
    surface === 'hero' ? 'bg-white/30' : `${bgClassForType(type)} ${badgeDarkClassForType(type)}`;
  const fg =
    surface === 'hero' ? 'text-black' : `${textOnTypeClass(type)} dark:text-white/90`;
  const padding = size === 'md' ? 'px-3 py-1.5' : size === 'sm' ? 'px-2 py-1' : 'px-2 py-0.5';
  const textSize = size === 'md' ? 'sm' : 'xs';
  // The card-sized badge drops bold for a medium weight: at this scale bold fills the pill
  // and reads cramped. sm and md keep the reference's bold.
  const weight = size === 'xs' ? 'font-medium' : 'font-bold';
  return (
    <Box className={`self-start rounded-full ${padding} ${bg}`}>
      <Text size={textSize} className={`capitalize ${weight} ${fg}`}>
        {type}
      </Text>
    </Box>
  );
}
