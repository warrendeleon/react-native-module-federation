import React from 'react';

import { Center } from './ui/center';
import { Spinner } from './ui/spinner';
import { Text } from './ui/text';

// --- Centred spinner with an optional caption. Composed from Gluestack Center + Spinner +
// Text. The default 'light' variant rides the colour scheme (blue spinner on off-white,
// white on navy); 'dark' is the fixed-navy pairing and currently has no caller. ---

export interface LoadingStateProps {
  caption?: string;
  variant?: 'light' | 'dark';
}

export function LoadingState({ caption, variant = 'light' }: LoadingStateProps) {
  const spinnerClass = variant === 'dark' ? 'text-white' : 'text-blue dark:text-white';
  const captionClass = variant === 'dark' ? 'text-lightGrey' : 'text-darkGrey dark:text-lightGrey';
  return (
    // Loading is a status message too, but a polite one: it should not interrupt whatever the
    // screen reader is already saying. A spinner conveys nothing on its own, so the caption is
    // what actually gets announced.
    <Center className="flex-1" accessible accessibilityLiveRegion="polite">
      <Spinner size="large" className={spinnerClass} />
      {caption ? (
        <Text size="sm" className={`mt-3 ${captionClass}`}>
          {caption}
        </Text>
      ) : null}
    </Center>
  );
}
