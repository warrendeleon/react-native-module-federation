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
    <Box className={`flex-row justify-between py-3.5 ${rule}`}>
      <Text size="sm" className="text-darkGrey dark:text-lightGrey">
        {label}
      </Text>
      <Text size="sm" bold className="text-black dark:text-white">
        {value}
      </Text>
    </Box>
  );
}
