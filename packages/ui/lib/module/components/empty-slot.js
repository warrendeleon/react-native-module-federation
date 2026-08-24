"use strict";

import React from 'react';
import { Box } from "./ui/box/index.js";
import { Text } from "./ui/text/index.js";

// --- An empty party slot: a dashed frame around a faint pokeball drawn from views (a ring, a
// band, a button), and the slot number. No asset, so it tints with the colour scheme like
// everything else, and it keeps the identity on a screen that is otherwise placeholders. ---
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function EmptySlot({
  number
}) {
  return (
    /*#__PURE__*/
    // One accessible element with one meaningful sentence: the drawn pokeball and the bare
    // numeral are decoration, and a screen reader that walked them would hear shapes and a
    // number with no meaning attached.
    _jsxs(Box, {
      accessible: true,
      accessibilityLabel: `Empty party slot ${number}`,
      className: "aspect-square items-center justify-center rounded-2xl border border-dashed border-midGrey/50",
      children: [/*#__PURE__*/_jsxs(Box, {
        className: "h-14 w-14 items-center justify-center overflow-hidden rounded-full border-2 border-midGrey/35",
        children: [/*#__PURE__*/_jsx(Box, {
          className: "absolute left-0 right-0 h-0.5 bg-midGrey/35"
        }), /*#__PURE__*/_jsx(Box, {
          className: "h-5 w-5 items-center justify-center rounded-full border-2 border-midGrey/35 bg-offWhite dark:bg-navy",
          children: /*#__PURE__*/_jsx(Box, {
            className: "h-2 w-2 rounded-full bg-midGrey/35"
          })
        })]
      }), /*#__PURE__*/_jsx(Text, {
        size: "xs",
        className: "mt-2 font-head text-midGrey/70",
        children: number
      })]
    })
  );
}
//# sourceMappingURL=empty-slot.js.map