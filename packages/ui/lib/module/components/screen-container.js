"use strict";

import React from 'react';
import { Box } from "./ui/box/index.js";
import { SafeAreaView } from "./ui/safe-area-view/index.js";

// --- Top-level wrapper every federated screen mounts inside. Owns the safe-area handling
// (top + bottom by default; explicitly opt-out for screens with their own tinted header that
// should bleed under the status bar). Every current screen uses the default 'light' variant,
// which rides the colour scheme (off-white in light, navy in dark); 'dark' is a fixed-navy
// option kept for surfaces that must stay dark in both schemes. Composed from the Gluestack
// SafeAreaView + Box primitives. ---
import { jsx as _jsx } from "react/jsx-runtime";
// The light surface carries its own dark: counterpart: when the shared styling runtime's
// colour scheme flips, every screen on the light variant repaints navy. The dark variant
// stays navy in both schemes and currently has no caller; it is the escape hatch for a
// surface that must not ride the scheme.
const BG = {
  light: 'bg-offWhite dark:bg-navy',
  dark: 'bg-navy'
};
export function ScreenContainer({
  variant = 'light',
  edges = ['top', 'bottom'],
  className = '',
  children
}) {
  return /*#__PURE__*/_jsx(SafeAreaView, {
    edges: edges,
    className: `flex-1 ${BG[variant]} ${className}`,
    children: /*#__PURE__*/_jsx(Box, {
      className: "flex-1",
      children: children
    })
  });
}
//# sourceMappingURL=screen-container.js.map