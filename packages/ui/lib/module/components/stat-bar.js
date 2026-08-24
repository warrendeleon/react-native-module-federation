"use strict";

import React, { useEffect } from 'react';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { bgClassForType } from "../tokens/typeColours.js";
import { Box } from "./ui/box/index.js";
import { Text } from "./ui/text/index.js";

// --- A single base-stat row: label, a track with a type-coloured fill proportional to the value,
// and the value. Lives in the design system (not the detail remote) so its token classes are
// compiled into the host stylesheet; a remote can't add arbitrary classes to a shared component
// and have them resolve. The fill width is the one inline style: it's a computed percentage with
// no token equivalent (the colour still comes from a token class). ---
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function StatBar({
  label,
  value,
  colourType,
  max = 160,
  index = 0
}) {
  const pct = Math.max(0, Math.min(100, value / max * 100));
  // The fill grows from zero on mount, each row a beat after the one above it.
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withDelay(index * 70, withTiming(1, {
      duration: 600
    }));
  }, [index, progress]);
  const fillStyle = useAnimatedStyle(() => ({
    width: `${progress.value * pct}%`
  }));
  return (
    /*#__PURE__*/
    // One accessible element so a screen reader announces "Attack, 49" as a value, not three
    // separate text reads. progressbar is the role for a bar showing a magnitude; accessibilityValue
    // carries the numeric range assistive tech expects of that role, plus the spoken text
    // (the visual scaling to `max` is presentation, so the text speaks the raw
    // value rather than a percentage).
    _jsxs(Box, {
      className: "flex-row items-center py-2.5",
      accessible: true,
      accessibilityRole: "progressbar",
      accessibilityLabel: label,
      accessibilityValue: {
        min: 0,
        max,
        now: Math.min(value, max),
        text: String(value)
      },
      children: [/*#__PURE__*/_jsx(Text, {
        size: "sm",
        className: "w-[72px] text-darkGrey dark:text-lightGrey",
        children: label
      }), /*#__PURE__*/_jsxs(Box, {
        className: "mx-3 h-2 flex-1 overflow-hidden rounded-full bg-lightGrey dark:bg-darkGrey",
        children: [/*#__PURE__*/_jsx(Animated.View, {
          style: [{
            height: '100%'
          }, fillStyle],
          children: /*#__PURE__*/_jsx(Box, {
            className: `h-full w-full rounded-full ${bgClassForType(colourType)}`
          })
        }), max > 100 ? /*#__PURE__*/_jsx(Box, {
          className: "absolute top-0 h-full w-px bg-darkGrey/40 dark:bg-white/40",
          style: {
            left: `${100 / max * 100}%`
          }
        }) : null]
      }), /*#__PURE__*/_jsx(Text, {
        size: "sm",
        className: "w-8 text-right font-head text-black dark:text-white",
        children: value
      })]
    })
  );
}
//# sourceMappingURL=stat-bar.js.map