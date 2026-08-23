import React from 'react';

import { Box } from './ui/box';
import { Text } from './ui/text';

// --- An empty party slot: a dashed frame around a faint pokeball drawn from views (a ring, a
// band, a button), and the slot number. No asset, so it tints with the colour scheme like
// everything else, and it keeps the identity on a screen that is otherwise placeholders. ---

export interface EmptySlotProps {
  number: number;
}

export function EmptySlot({ number }: EmptySlotProps) {
  return (
    <Box className="aspect-square items-center justify-center rounded-2xl border border-dashed border-midGrey/50">
      <Box className="h-14 w-14 items-center justify-center overflow-hidden rounded-full border-2 border-midGrey/35">
        <Box className="absolute left-0 right-0 h-0.5 bg-midGrey/35" />
        <Box className="h-5 w-5 items-center justify-center rounded-full border-2 border-midGrey/35 bg-offWhite dark:bg-navy">
          <Box className="h-2 w-2 rounded-full bg-midGrey/35" />
        </Box>
      </Box>
      <Text size="xs" className="mt-2 font-head text-midGrey/70">
        {number}
      </Text>
    </Box>
  );
}
