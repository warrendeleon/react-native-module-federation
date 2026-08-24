import React from 'react';

import { Box } from './ui/box';
import { SafeAreaView } from './ui/safe-area-view';

// --- Top-level wrapper every federated screen mounts inside. Owns the safe-area handling
// (top + bottom by default; explicitly opt-out for screens with their own tinted header that
// should bleed under the status bar). Every current screen uses the default 'light' variant,
// which rides the colour scheme (off-white in light, navy in dark); 'dark' is a fixed-navy
// option kept for surfaces that must stay dark in both schemes. Composed from the Gluestack
// SafeAreaView + Box primitives. ---

type Variant = 'light' | 'dark';
type EdgesProp = ('top' | 'bottom' | 'left' | 'right')[];

export interface ScreenContainerProps {
  variant?: Variant;
  edges?: EdgesProp;
  className?: string;
  children?: React.ReactNode;
}

// The light surface carries its own dark: counterpart: when the shared styling runtime's
// colour scheme flips, every screen on the light variant repaints navy. The dark variant
// stays navy in both schemes and currently has no caller; it is the escape hatch for a
// surface that must not ride the scheme.
const BG = {
  light: 'bg-offWhite dark:bg-navy',
  dark: 'bg-navy',
} as const;

export function ScreenContainer({
  variant = 'light',
  edges = ['top', 'bottom'],
  className = '',
  children,
}: ScreenContainerProps) {
  return (
    <SafeAreaView edges={edges} className={`flex-1 ${BG[variant]} ${className}`}>
      <Box className="flex-1">{children}</Box>
    </SafeAreaView>
  );
}
