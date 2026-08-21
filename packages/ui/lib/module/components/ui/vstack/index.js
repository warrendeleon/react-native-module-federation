"use strict";

import React from 'react';
import { View } from 'react-native';
import { vstackStyle } from "./styles.js";
import { jsx as _jsx } from "react/jsx-runtime";
const VStack = /*#__PURE__*/React.forwardRef(function VStack({
  className,
  space,
  reversed,
  ...props
}, ref) {
  return /*#__PURE__*/_jsx(View, {
    className: vstackStyle({
      space,
      reversed: reversed,
      class: className
    }),
    ...props,
    ref: ref
  });
});
VStack.displayName = 'VStack';
export { VStack };
//# sourceMappingURL=index.js.map