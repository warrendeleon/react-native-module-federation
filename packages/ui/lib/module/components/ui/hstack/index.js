"use strict";

import React from 'react';
import { View } from 'react-native';
import { hstackStyle } from "./styles.js";
import { jsx as _jsx } from "react/jsx-runtime";
const HStack = /*#__PURE__*/React.forwardRef(function HStack({
  className,
  space,
  reversed,
  ...props
}, ref) {
  return /*#__PURE__*/_jsx(View, {
    className: hstackStyle({
      space,
      reversed: reversed,
      class: className
    }),
    ...props,
    ref: ref
  });
});
HStack.displayName = 'HStack';
export { HStack };
//# sourceMappingURL=index.js.map