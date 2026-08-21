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
  switch (size) {
    case '5xl':
    case '4xl':
    case '3xl':
      return /*#__PURE__*/_jsx(H1, {
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
        // @ts-expect-error Polymorphic ref: this branch can render H1..H6 but the
        // outer forwardRef pins the ref type to React.ComponentRef<typeof H1>. TS
        // can't narrow the ref shape per-mapped-element. Suppression is upstream
        // (gluestack-ui v3); revisit if/when Gluestack types the polymorphism.
        ref: ref
      });
    case '2xl':
      return /*#__PURE__*/_jsx(H2, {
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
        // @ts-expect-error Polymorphic ref: this branch can render H1..H6 but the
        // outer forwardRef pins the ref type to React.ComponentRef<typeof H1>. TS
        // can't narrow the ref shape per-mapped-element. Suppression is upstream
        // (gluestack-ui v3); revisit if/when Gluestack types the polymorphism.
        ref: ref
      });
    case 'xl':
      return /*#__PURE__*/_jsx(H3, {
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
        // @ts-expect-error Polymorphic ref: this branch can render H1..H6 but the
        // outer forwardRef pins the ref type to React.ComponentRef<typeof H1>. TS
        // can't narrow the ref shape per-mapped-element. Suppression is upstream
        // (gluestack-ui v3); revisit if/when Gluestack types the polymorphism.
        ref: ref
      });
    case 'lg':
      return /*#__PURE__*/_jsx(H4, {
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
        // @ts-expect-error Polymorphic ref: this branch can render H1..H6 but the
        // outer forwardRef pins the ref type to React.ComponentRef<typeof H1>. TS
        // can't narrow the ref shape per-mapped-element. Suppression is upstream
        // (gluestack-ui v3); revisit if/when Gluestack types the polymorphism.
        ref: ref
      });
    case 'md':
      return /*#__PURE__*/_jsx(H5, {
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
        // @ts-expect-error Polymorphic ref: this branch can render H1..H6 but the
        // outer forwardRef pins the ref type to React.ComponentRef<typeof H1>. TS
        // can't narrow the ref shape per-mapped-element. Suppression is upstream
        // (gluestack-ui v3); revisit if/when Gluestack types the polymorphism.
        ref: ref
      });
    case 'sm':
    case 'xs':
      return /*#__PURE__*/_jsx(H6, {
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
        // @ts-expect-error Polymorphic ref: this branch can render H1..H6 but the
        // outer forwardRef pins the ref type to React.ComponentRef<typeof H1>. TS
        // can't narrow the ref shape per-mapped-element. Suppression is upstream
        // (gluestack-ui v3); revisit if/when Gluestack types the polymorphism.
        ref: ref
      });
    default:
      return /*#__PURE__*/_jsx(H4, {
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
        // @ts-expect-error Polymorphic ref: this branch can render H1..H6 but the
        // outer forwardRef pins the ref type to React.ComponentRef<typeof H1>. TS
        // can't narrow the ref shape per-mapped-element. Suppression is upstream
        // (gluestack-ui v3); revisit if/when Gluestack types the polymorphism.
        ref: ref
      });
  }
}));
const Heading = /*#__PURE__*/memo(/*#__PURE__*/forwardRef(function Heading({
  className,
  size = 'lg',
  as: AsComp,
  ...props
}, ref) {
  const {
    isTruncated,
    bold,
    underline,
    strikeThrough,
    sub,
    italic,
    highlight
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
      ...props
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