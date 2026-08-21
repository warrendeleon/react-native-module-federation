"use strict";

import React from 'react';
import { Center } from "./ui/center/index.js";
import { Spinner } from "./ui/spinner/index.js";
import { Text } from "./ui/text/index.js";

// --- Centred spinner with an optional caption. Composed from Gluestack Center + Spinner +
// Text. Variant: 'light' tints the spinner blue against an off-white screen; 'dark' tints it
// white against the navy Party tab background. ---
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function LoadingState({
  caption,
  variant = 'light'
}) {
  const spinnerClass = variant === 'dark' ? 'text-white' : 'text-blue dark:text-white';
  const captionClass = variant === 'dark' ? 'text-lightGrey' : 'text-darkGrey dark:text-lightGrey';
  return /*#__PURE__*/_jsxs(Center, {
    className: "flex-1",
    children: [/*#__PURE__*/_jsx(Spinner, {
      size: "large",
      className: spinnerClass
    }), caption ? /*#__PURE__*/_jsx(Text, {
      size: "sm",
      className: `mt-3 ${captionClass}`,
      children: caption
    }) : null]
  });
}
//# sourceMappingURL=loading-state.js.map