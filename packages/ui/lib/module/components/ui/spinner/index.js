"use strict";
'use client';

import { ActivityIndicator } from 'react-native';
import React from 'react';
import { tva } from '@gluestack-ui/utils/nativewind-utils';
import { cssInterop } from 'nativewind';
import { jsx as _jsx } from "react/jsx-runtime";
cssInterop(ActivityIndicator, {
  className: {
    target: 'style',
    nativeStyleToProp: {
      color: true
    }
  }
});
const spinnerStyle = tva({});
const Spinner = /*#__PURE__*/React.forwardRef(function Spinner({
  className,
  color,
  focusable = false,
  'aria-label': ariaLabel = 'loading',
  ...props
}, ref) {
  return /*#__PURE__*/_jsx(ActivityIndicator, {
    ref: ref,
    focusable: focusable,
    "aria-label": ariaLabel,
    ...props,
    color: color,
    className: spinnerStyle({
      class: className
    })
  });
});
Spinner.displayName = 'Spinner';
export { Spinner };
//# sourceMappingURL=index.js.map