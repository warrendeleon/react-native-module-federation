"use strict";

import React from 'react';
import { Button, ButtonText } from "./ui/button/index.js";
import { Center } from "./ui/center/index.js";
import { Heading } from "./ui/heading/index.js";
import { Text } from "./ui/text/index.js";

// --- Error state with retry. Composed from Gluestack Center + Heading + Text + Button.
// Variant tracks ScreenContainer: the default rides the colour scheme, and 'dark' pairs
// with a fixed-navy container if a screen ever uses one. ---
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
  retryLabel = 'Retry',
  variant = 'light'
}) {
  const titleClass = variant === 'dark' ? 'text-white' : 'text-red dark:text-white';
  const bodyClass = variant === 'dark' ? 'text-lightGrey' : 'text-darkGrey dark:text-lightGrey';
  return /*#__PURE__*/_jsxs(Center, {
    className: "flex-1 px-6",
    children: [/*#__PURE__*/_jsx(Heading, {
      size: "lg",
      className: `mb-2 ${titleClass}`,
      children: title
    }), message ? /*#__PURE__*/_jsx(Text, {
      size: "sm",
      className: `mb-4 text-center ${bodyClass}`,
      children: message
    }) : null, onRetry ? /*#__PURE__*/_jsx(Button, {
      action: "primary",
      size: "md",
      onPress: onRetry,
      children: /*#__PURE__*/_jsx(ButtonText, {
        children: retryLabel
      })
    }) : null]
  });
}
//# sourceMappingURL=error-state.js.map