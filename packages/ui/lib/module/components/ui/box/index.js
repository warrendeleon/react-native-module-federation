"use strict";

import React from 'react';
import { View } from 'react-native';
import { boxStyle } from "./styles.js";
import { jsx as _jsx } from "react/jsx-runtime";
const Box = /*#__PURE__*/React.forwardRef(function Box({
  className,
  ...props
}, ref) {
  return /*#__PURE__*/_jsx(View, {
    ref: ref,
    ...props,
    className: boxStyle({
      class: className
    })
  });
});
Box.displayName = 'Box';
export { Box };
//# sourceMappingURL=index.js.map