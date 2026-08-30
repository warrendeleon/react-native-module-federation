"use strict";

import React from 'react';
import { Image } from 'react-native';
import { useColorScheme } from 'nativewind';
import { colours } from "../tokens/colours.js";
import { BACK_PILL_SCRIM_CLASS } from "../tokens/typeColours.js";
import { Pressable } from "./ui/pressable/index.js";

// --- The floating back control for full-bleed screens. A headerless route has no navigation
// bar to put a back button in, so the control floats over the content — and because it floats,
// it has to carry its own surface on every background it can land on: a pastel hero at rest,
// the scheme surface once the compact bar is up. A chevron, not a cross: the screen arrives as
// a push, and the affordance should say "back", not "dismiss".
//
// Positioning stays with the caller (safe-area insets are the screen's business); this
// component owns the look so every consumer floats the same pill. ---
import { jsx as _jsx } from "react/jsx-runtime";
export function BackPill({
  onPress,
  accessibilityLabel = 'Go back',
  style
}) {
  const {
    colorScheme
  } = useColorScheme();
  const dark = colorScheme === 'dark';
  return /*#__PURE__*/_jsx(Pressable, {
    onPress: onPress,
    hitSlop: 12,
    accessibilityRole: "button",
    accessibilityLabel: accessibilityLabel,
    className: dark ?
    // A dark scrim, not a light wash: the pill can sit over the pastel hero or the navy
    // compact bar, and the scrim plus a white glyph clears 3:1 on both. A white wash only
    // managed it on the navy. The scrim class comes from the token module rather than
    // being spelled here, so the value the matrix composites and the value the pill
    // paints cannot drift; see BACK_PILL_SCRIM_ALPHA for why it is typeInk and not black.
    `h-9 w-9 items-center justify-center rounded-full border border-white/20 ${BACK_PILL_SCRIM_CLASS} active:opacity-60` : 'h-9 w-9 items-center justify-center rounded-full border border-black/10 bg-white shadow-sm shadow-black/20 active:opacity-60',
    style: style,
    children: /*#__PURE__*/_jsx(Image, {
      source: require('../assets/chevron-left.png'),
      style: {
        width: 20,
        height: 20,
        marginLeft: -2,
        tintColor: dark ? colours.white : colours.darkGrey
      },
      resizeMode: "contain"
    })
  });
}
//# sourceMappingURL=back-pill.js.map