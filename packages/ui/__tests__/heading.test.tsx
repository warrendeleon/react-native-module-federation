/**
 * @format
 */

import React from 'react';
import { Text } from 'react-native';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Heading } from '../src/components/ui/heading';

test('the as branch forwards the ref and keeps styling props to itself', async () => {
  const ref = React.createRef<Text>();
  let tree!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    tree = ReactTestRenderer.create(
      <Heading as={Text} size="2xl" bold isTruncated testID="custom-heading" ref={ref as never}>
        Bulbasaur
      </Heading>,
    );
  });
  // The host element, not the composite: findByProps would match the <Heading> element
  // itself, whose props of course still carry the variants.
  const rendered = tree.root.findAll(
    n => n.props.testID === 'custom-heading' && typeof n.type === 'string',
  )[0];
  // Variant props are consumed into the class string, never forwarded to the element.
  expect(rendered.props.bold).toBeUndefined();
  expect(rendered.props.isTruncated).toBeUndefined();
  expect(typeof rendered.props.className).toBe('string');
  expect(ref.current).not.toBeNull();
  await act(async () => tree.unmount());
});
