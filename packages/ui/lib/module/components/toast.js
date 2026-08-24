"use strict";

import React, { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { tintBgClassForType } from "../tokens/typeColours.js";
import { Box } from "./ui/box/index.js";
import { HStack } from "./ui/hstack/index.js";
import { Image } from "./ui/image/index.js";
import { Text } from "./ui/text/index.js";

// --- Transient feedback for cross-module actions. The same trick the colour scheme plays:
// module-level state inside a shared singleton. Any surface in the federation calls toast()
// and the one Toaster the host mounts shows it, because every bundle imports this exact module
// instance through the share scope. No context to thread, no event bus to invent, no reducer —
// a toast is fire-and-forget presentation, not state anyone reads back.
//
// The design is the app's, not a stock snackbar: the subject's sprite rides in the capsule in
// the same type-tinted disc the cards use, the surface inverts against the scheme (navy pill
// in light, light pill in dark), and the entrance is a spring, not a fade. The screen-reader
// announcement rides along in toast() itself, so callers cannot show a visual confirmation
// and forget the accessible one. ---
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
let listener = null;
let counter = 0;

/**
 * Show a transient confirmation. Safe to call from any module. Before a Toaster mounts the
 * visual side goes nowhere, but the screen-reader announcement always fires: assistive users
 * get the confirmation even if the host's chrome is not up yet.
 */
export function toast(message, options) {
  AccessibilityInfo.announceForAccessibility(message);
  listener?.({
    id: ++counter,
    message,
    ...options
  });
}
export function Toaster({
  bottomOffset = 24
}) {
  const [current, setCurrent] = useState(null);
  useEffect(() => {
    listener = entry => setCurrent(entry);
    return () => {
      listener = null;
    };
  }, []);

  // Each toast lives ~2 seconds; a new one replaces the old (the key remount below restarts
  // the entrance animation rather than queueing a backlog nobody waits for).
  useEffect(() => {
    if (!current) {
      return;
    }
    const t = setTimeout(() => setCurrent(null), 2200);
    return () => clearTimeout(t);
  }, [current]);
  if (!current) {
    return null;
  }
  return /*#__PURE__*/_jsx(Animated.View, {
    entering: FadeInDown.springify().damping(18).stiffness(220),
    exiting: FadeOutDown.duration(180),
    pointerEvents: "none",
    style: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: bottomOffset,
      alignItems: 'center'
    },
    children: /*#__PURE__*/_jsxs(HStack, {
      space: "sm",
      className: "max-w-[90%] items-center rounded-full bg-navy/95 py-1.5 pl-1.5 pr-5 shadow-md shadow-black/30 dark:border dark:border-black/10 dark:bg-offWhite",
      children: [current.spriteUri ? /*#__PURE__*/_jsx(Box, {
        className: `h-8 w-8 items-center justify-center overflow-hidden rounded-full ${tintBgClassForType(current.accentType ?? 'normal')}`,
        children: /*#__PURE__*/_jsx(Image, {
          source: {
            uri: current.spriteUri
          },
          alt: "",
          className: "h-7 w-7",
          resizeMode: "contain"
        })
      }) : /*#__PURE__*/_jsx(Box, {
        className: "w-2"
      }), /*#__PURE__*/_jsx(Text, {
        size: "sm",
        className: "font-semi text-white dark:text-navy",
        numberOfLines: 1,
        children: current.message
      })]
    })
  }, current.id);
}
//# sourceMappingURL=toast.js.map