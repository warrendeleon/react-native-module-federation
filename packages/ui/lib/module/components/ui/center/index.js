"use strict";

import { View } from 'react-native';
import React from 'react';
import { centerStyle } from "./styles.js";
import { jsx as _jsx } from "react/jsx-runtime";
const Center = /*#__PURE__*/React.forwardRef(function Center({
  className,
  ...props
}, ref) {
  return /*#__PURE__*/_jsx(View, {
    className: centerStyle({
      class: className
    }),
    ...props,
    ref: ref
  });
});
Center.displayName = 'Center';
export { Center };
//# sourceMappingURL=index.js.map