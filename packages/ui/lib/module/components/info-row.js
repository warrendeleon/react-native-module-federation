"use strict";

import React from 'react';
import { Box } from "./ui/box/index.js";
import { Text } from "./ui/text/index.js";

// --- A label/value row with a hairline divider, for the detail screen's Info section
// (Height / Weight / Abilities). In the design system so its divider + text token classes are
// host-compiled and apply to the shared primitives from a remote. ---
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function InfoRow({
  label,
  value
}) {
  return /*#__PURE__*/_jsxs(Box, {
    className: "flex-row justify-between border-b border-lightGrey py-3.5 dark:border-darkGrey",
    children: [/*#__PURE__*/_jsx(Text, {
      size: "sm",
      className: "text-darkGrey dark:text-lightGrey",
      children: label
    }), /*#__PURE__*/_jsx(Text, {
      size: "sm",
      bold: true,
      className: "text-black dark:text-white",
      children: value
    })]
  });
}
//# sourceMappingURL=info-row.js.map