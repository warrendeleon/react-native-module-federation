"use strict";
'use client';

import React from 'react';
import { createPressable } from '@gluestack-ui/core/pressable/creator';
import { Pressable as RNPressable } from 'react-native';
import { tva } from '@gluestack-ui/utils/nativewind-utils';
import { withStyleContext } from '@gluestack-ui/utils/nativewind-utils';
import { jsx as _jsx } from "react/jsx-runtime";
const UIPressable = createPressable({
  Root: withStyleContext(RNPressable)
});
const pressableStyle = tva({
  base: 'data-[focus-visible=true]:outline-none data-[focus-visible=true]:ring-indicator-info data-[focus-visible=true]:ring-2 data-[disabled=true]:opacity-40'
});
const Pressable = /*#__PURE__*/React.forwardRef(function Pressable({
  className,
  ...props
}, ref) {
  return /*#__PURE__*/_jsx(UIPressable, {
    ...props,
    ref: ref,
    className: pressableStyle({
      class: className
    })
  });
});
Pressable.displayName = 'Pressable';
export { Pressable };
//# sourceMappingURL=index.js.map