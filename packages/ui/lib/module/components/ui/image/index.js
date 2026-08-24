"use strict";

import React from 'react';
import { createImage } from '@gluestack-ui/core/image/creator';
import { Image as RNImage } from 'react-native';
import { tva } from '@gluestack-ui/utils/nativewind-utils';
import { jsx as _jsx } from "react/jsx-runtime";
const imageStyle = tva({
  base: 'max-w-full',
  variants: {
    size: {
      '2xs': 'h-6 w-6',
      'xs': 'h-10 w-10',
      'sm': 'h-16 w-16',
      'md': 'h-20 w-20',
      'lg': 'h-24 w-24',
      'xl': 'h-32 w-32',
      '2xl': 'h-64 w-64',
      'full': 'h-full w-full',
      'none': ''
    }
  }
});
const UIImage = createImage({
  Root: RNImage
});
const Image = /*#__PURE__*/React.forwardRef(function Image({
  size = 'md',
  className,
  ...props
}, ref) {
  return /*#__PURE__*/_jsx(UIImage, {
    className: imageStyle({
      size,
      class: className
    }),
    ...props,
    ref: ref
  });
});
Image.displayName = 'Image';
export { Image };
//# sourceMappingURL=index.js.map