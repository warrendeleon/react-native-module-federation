"use strict";

import React from 'react';
import { bgClassForType, textOnTypeClass } from "../tokens/typeColours.js";
import { Box } from "./ui/box/index.js";
import { Text } from "./ui/text/index.js";

// --- Coloured pill that displays a Pokémon type (Fire, Water, etc). Both background and
// text colour come from token classes (bg-type-<name> + text-white/black) defined in the
// shared Tailwind preset. No inline styles; designers can re-skin the whole type palette by
// editing tailwind.preset.js. Composed from Gluestack Box + Text primitives. ---
import { jsx as _jsx } from "react/jsx-runtime";
export function TypeBadge({
  type,
  size = 'sm',
  surface = 'card'
}) {
  const bg = surface === 'hero' ? 'bg-white/30' : bgClassForType(type);
  const fg = surface === 'hero' ? 'text-black' : textOnTypeClass(type);
  const padding = size === 'md' ? 'px-3 py-1.5' : size === 'sm' ? 'px-2 py-1' : 'px-1.5 py-0.5';
  const textSize = size === 'md' ? 'sm' : size === 'sm' ? 'xs' : '2xs';
  return /*#__PURE__*/_jsx(Box, {
    className: `self-start rounded-full ${padding} ${bg}`,
    children: /*#__PURE__*/_jsx(Text, {
      size: textSize,
      bold: true,
      className: `capitalize ${fg}`,
      children: type
    })
  });
}
//# sourceMappingURL=type-badge.js.map