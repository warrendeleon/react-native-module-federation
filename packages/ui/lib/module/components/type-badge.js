"use strict";

import React from 'react';
import { badgeDarkClassForType, bgClassForType, textOnTypeClass } from "../tokens/typeColours.js";
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
  // On a card the pill dims to a tonal wash in dark mode; the hero variant never does, because
  // the hero surface itself stays the light type tint in both schemes.
  const bg = surface === 'hero' ? 'bg-white/30' : `${bgClassForType(type)} ${badgeDarkClassForType(type)}`;
  const fg = surface === 'hero' ? 'text-black' : `${textOnTypeClass(type)} dark:text-white/90`;
  const padding = size === 'md' ? 'px-3 py-1.5' : size === 'sm' ? 'px-2 py-1' : 'px-2 py-0.5';
  const textSize = size === 'md' ? 'sm' : 'xs';
  // The card-sized badge drops bold for a medium weight: at this scale bold fills the pill
  // and reads cramped. sm and md keep the reference's bold.
  const weight = size === 'xs' ? 'font-medium' : 'font-bold';
  return /*#__PURE__*/_jsx(Box, {
    className: `self-start rounded-full ${padding} ${bg}`,
    children: /*#__PURE__*/_jsx(Text, {
      size: textSize,
      className: `capitalize ${weight} ${fg}`,
      children: type
    })
  });
}
//# sourceMappingURL=type-badge.js.map