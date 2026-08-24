"use strict";

import React, { forwardRef, memo } from 'react';
import { H1, H2, H3, H4, H5, H6 } from '@expo/html-elements';
import { headingStyle } from "./styles.js";
import { cssInterop } from 'nativewind';
import { jsx as _jsx } from "react/jsx-runtime";
cssInterop(H1, {
  className: 'style'
});
cssInterop(H2, {
  className: 'style'
});
cssInterop(H3, {
  className: 'style'
});
cssInterop(H4, {
  className: 'style'
});
cssInterop(H5, {
  className: 'style'
});
cssInterop(H6, {
  className: 'style'
});

// The six heading elements share one props-and-ref surface: @expo/html-elements builds each
// on the same Text primitive. TS types each element's instance as a union it cannot equate
// across the forwardRef boundary, so the shared surface is stated once, here, as the map's
// value type — the assertion is the single typed seam, true for all six by construction.

// The assertion below is that seam. TS cannot prove the equivalence structurally (the six
// exotic component types differ in defaultProps variance), but every element wraps the same
// Text primitive with the same props and instance type, which is what HeadingElement states.
const TAG_FOR_SIZE = {
  '5xl': H1,
  '4xl': H1,
  '3xl': H1,
  '2xl': H2,
  xl: H3,
  lg: H4,
  md: H5,
  sm: H6,
  xs: H6
};
const MappedHeading = /*#__PURE__*/memo(/*#__PURE__*/forwardRef(function MappedHeading({
  size,
  className,
  isTruncated,
  bold,
  underline,
  strikeThrough,
  sub,
  italic,
  highlight,
  ...props
}, ref) {
  const Tag = TAG_FOR_SIZE[size] ?? H4;
  return /*#__PURE__*/_jsx(Tag, {
    className: headingStyle({
      size,
      isTruncated: isTruncated,
      bold: bold,
      underline: underline,
      strikeThrough: strikeThrough,
      sub: sub,
      italic: italic,
      highlight: highlight,
      class: className
    }),
    ...props,
    ref: ref
  });
}));
const Heading = /*#__PURE__*/memo(/*#__PURE__*/forwardRef(function Heading({
  className,
  size = 'lg',
  as: AsComp,
  ...props
}, ref) {
  // The styling variants are consumed here, into the class string; the rest of the props
  // travel to the rendered element. Spreading the originals as well would hand a custom
  // `as` element props like isTruncated that only headingStyle understands.
  const {
    isTruncated,
    bold,
    underline,
    strikeThrough,
    sub,
    italic,
    highlight,
    ...forwarded
  } = props;
  if (AsComp) {
    return /*#__PURE__*/_jsx(AsComp, {
      className: headingStyle({
        size,
        isTruncated: isTruncated,
        bold: bold,
        underline: underline,
        strikeThrough: strikeThrough,
        sub: sub,
        italic: italic,
        highlight: highlight,
        class: className
      }),
      ...forwarded,
      ref: ref
    });
  }
  return /*#__PURE__*/_jsx(MappedHeading, {
    className: className,
    size: size,
    ref: ref,
    ...props
  });
}));
Heading.displayName = 'Heading';
export { Heading };
//# sourceMappingURL=index.js.map