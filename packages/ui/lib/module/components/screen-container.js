"use strict";

import React from 'react';
import { Box } from "./ui/box/index.js";
import { SafeAreaView } from "./ui/safe-area-view/index.js";

// --- Top-level wrapper every federated screen mounts inside. Owns the safe-area handling
// (top + bottom by default; explicitly opt-out for screens with their own tinted header that
// should bleed under the status bar). Variant: 'light' is the off-white screen background
// (Pokédex tab, Detail body); 'dark' is the navy used on the Party tab to give it a strong
// visual differentiator. Composed from the Gluestack SafeAreaView + Box primitives. ---
import { jsx as _jsx } from "react/jsx-runtime";
// The light surface carries its own dark: counterpart: when the shared styling runtime's
// colour scheme flips, every screen on the light variant repaints navy. The dark variant is
// the Party tab's fixed look and stays navy in both schemes.
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