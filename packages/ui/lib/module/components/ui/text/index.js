"use strict";

import React from 'react';
import { Text as RNText } from 'react-native';
import { textStyle } from "./styles.js";
import { jsx as _jsx } from "react/jsx-runtime";
const Text = /*#__PURE__*/React.forwardRef(function Text({
  className,
  isTruncated,
  bold,
  underline,
  strikeThrough,
  size = 'md',
  sub,
  italic,
  highlight,
  ...props
}, ref) {
  return /*#__PURE__*/_jsx(RNText, {
    className: textStyle({
      isTruncated: isTruncated,
      bold: bold,
      underline: underline,
      strikeThrough: strikeThrough,
      size,
      sub: sub,
      italic: italic,
      highlight: highlight,
      class: className
    }),
    ...props,
    ref: ref
  });
});
Text.displayName = 'Text';
export { Text };
//# sourceMappingURL=index.js.map