import React from 'react';

import { Box } from './ui/box';
import { Text } from './ui/text';

// --- A label/value row with a hairline divider, for the detail screen's Info section
// (Height / Weight / Abilities). In the design system so its divider + text token classes are
// host-compiled and apply to the shared primitives from a remote. ---

export interface InfoRowProps {
  label: string;
  value: string;
  /** Set on the last row of a section card so it does not draw a rule against the card edge. */
  last?: boolean;
}

export function InfoRow({ label, value, last = false }: InfoRowProps) {
  const rule = last ? '' : 'border-b border-lightGrey dark:border-darkGrey';
  return (
    // The value takes the leftover width and wraps inside it. React Native gives flex items
    // flexShrink: 0 (unlike the web's 1), so a long value — a three-ability Pokémon like
    // Venomoth's "Shield Dust, Tinted Lens, Wonder Skin" — pushes past the card's edge instead
    // of wrapping. flex-1 on the value and a non-shrinking label keep every row inside the card.
    <Box className={`flex-row items-start justify-between gap-4 py-3.5 ${rule}`}>
      <Text size="sm" className="shrink-0 text-darkGrey dark:text-lightGrey">
        {label}
      </Text>
      <Text size="sm" bold className="flex-1 text-right text-black dark:text-white">
        {value}
      </Text>
    </Box>
  );
}
