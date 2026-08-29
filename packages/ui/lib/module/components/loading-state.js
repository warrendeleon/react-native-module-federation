"use strict";

import React from 'react';
import { Center } from "./ui/center/index.js";
import { Spinner } from "./ui/spinner/index.js";
import { Text } from "./ui/text/index.js";

// --- Centred spinner with an optional caption. Composed from Gluestack Center + Spinner +
// Text. The default 'light' variant rides the colour scheme (blue spinner on off-white,
// white on navy); 'dark' is the fixed-navy pairing and currently has no caller. ---
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function LoadingState({
  caption,
  variant = 'light'
}) {
  const spinnerClass = variant === 'dark' ? 'text-white' : 'text-blue dark:text-white';
  const captionClass = variant === 'dark' ? 'text-lightGrey' : 'text-darkGrey dark:text-lightGrey';
  return (
    /*#__PURE__*/
    // Loading is a status message too, but a polite one: it should not interrupt whatever the
    // screen reader is already saying. A spinner conveys nothing on its own, so the caption is
    // what actually gets announced.
    _jsxs(Center, {
      className: "flex-1",
      accessible: true,
      accessibilityLiveRegion: "polite",
      children: [/*#__PURE__*/_jsx(Spinner, {
        size: "large",
        className: spinnerClass
      }), caption ? /*#__PURE__*/_jsx(Text, {
        size: "sm",
        className: `mt-3 ${captionClass}`,
        children: caption
      }) : null]
    })
  );
}
//# sourceMappingURL=loading-state.js.map