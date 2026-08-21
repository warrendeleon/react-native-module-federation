"use strict";

import React from 'react';
import { View } from 'react-native';
import { cardStyle } from "./styles.js";
import { jsx as _jsx } from "react/jsx-runtime";
const Card = /*#__PURE__*/React.forwardRef(function Card({
  className,
  size = 'md',
  variant = 'elevated',
  ...props
}, ref) {
  return /*#__PURE__*/_jsx(View, {
    className: cardStyle({
      size,
      variant,
      class: className
    }),
    ...props,
    ref: ref
  });
});
Card.displayName = 'Card';
export { Card };
//# sourceMappingURL=index.js.map