import React, { forwardRef, memo } from 'react';
import { H1, H2, H3, H4, H5, H6 } from '@expo/html-elements';
import { headingStyle } from './styles';
import type { VariantProps } from '@gluestack-ui/utils/nativewind-utils';
import { cssInterop } from 'nativewind';

type IHeadingProps = VariantProps<typeof headingStyle> &
  React.ComponentPropsWithoutRef<typeof H1> & {
    as?: React.ElementType;
  };

cssInterop(H1, { className: 'style' });
cssInterop(H2, { className: 'style' });
cssInterop(H3, { className: 'style' });
cssInterop(H4, { className: 'style' });
cssInterop(H5, { className: 'style' });
cssInterop(H6, { className: 'style' });

// The six heading elements share one props-and-ref surface: @expo/html-elements builds each
// on the same Text primitive. TS types each element's instance as a union it cannot equate
// across the forwardRef boundary, so the shared surface is stated once, here, as the map's
// value type — the assertion is the single typed seam, true for all six by construction.
type HeadingElement = React.ComponentType<
  React.ComponentPropsWithoutRef<typeof H1> & {
    ref?: React.ForwardedRef<React.ComponentRef<typeof H1>>;
  }
>;
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
  xs: H6,
} as unknown as Record<string, HeadingElement>;

const MappedHeading = memo(
  forwardRef<React.ComponentRef<typeof H1>, IHeadingProps>(
    function MappedHeading(
      {
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
      },
      ref
    ) {
      const Tag = TAG_FOR_SIZE[size as string] ?? H4;
      return (
        <Tag
          className={headingStyle({
            size,
            isTruncated: isTruncated as boolean,
            bold: bold as boolean,
            underline: underline as boolean,
            strikeThrough: strikeThrough as boolean,
            sub: sub as boolean,
            italic: italic as boolean,
            highlight: highlight as boolean,
            class: className,
          })}
          {...props}
          ref={ref}
        />
      );
    }
  )
);

const Heading = memo(
  forwardRef<React.ComponentRef<typeof H1>, IHeadingProps>(function Heading(
    { className, size = 'lg', as: AsComp, ...props },
    ref
  ) {
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
      return (
        <AsComp
          className={headingStyle({
            size,
            isTruncated: isTruncated as boolean,
            bold: bold as boolean,
            underline: underline as boolean,
            strikeThrough: strikeThrough as boolean,
            sub: sub as boolean,
            italic: italic as boolean,
            highlight: highlight as boolean,
            class: className,
          })}
          {...forwarded}
          ref={ref}
        />
      );
    }

    return (
      <MappedHeading className={className} size={size} ref={ref} {...props} />
    );
  })
);

Heading.displayName = 'Heading';

export { Heading };
