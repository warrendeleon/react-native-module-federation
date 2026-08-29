import React from 'react';

import { Button, ButtonText } from './ui/button';
import { Center } from './ui/center';
import { Heading } from './ui/heading';
import { Text } from './ui/text';

// --- Error state with retry. Composed from Gluestack Center + Heading + Text + Button.
// Variant tracks ScreenContainer: the default rides the colour scheme, and 'dark' pairs
// with a fixed-navy container if a screen ever uses one. ---

export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
  variant?: 'light' | 'dark';
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
  retryLabel = 'Retry',
  variant = 'light',
}: ErrorStateProps) {
  const titleClass = variant === 'dark' ? 'text-white' : 'text-red dark:text-white';
  const bodyClass = variant === 'dark' ? 'text-lightGrey' : 'text-darkGrey dark:text-lightGrey';
  return (
    // A failed load is a status message (SC 4.1.3): it appears without moving focus, so a
    // screen reader has to be told about it or it is silent. `alert` announces on both
    // platforms without a live region, which iOS has no equivalent for.
    // `accessible` is what makes the region one element to a screen reader, and what makes the
    // role queryable at all: a role on a view nobody has marked accessible is inert.
    <Center className="flex-1 px-6" accessible accessibilityRole="alert">
      <Heading size="lg" className={`mb-2 ${titleClass}`}>
        {title}
      </Heading>
      {message ? (
        <Text size="sm" className={`mb-4 text-center ${bodyClass}`}>
          {message}
        </Text>
      ) : null}
      {onRetry ? (
        // The retry is the way back from a failed load, so its tappable size is declared here
        // rather than left to the size variant. A variant is a visual decision; the minimum
        // target is a commitment, and a declared one is the only kind a suite can verify.
        // Both axes are declared: the button is far wider than 44 in every layout it appears in,
        // but a width nobody states is a width nobody has measured.
        <Button
          action="primary"
          size="md"
          onPress={onRetry}
          style={{ minWidth: 44, minHeight: 44 }}>
          <ButtonText>{retryLabel}</ButtonText>
        </Button>
      ) : null}
    </Center>
  );
}
