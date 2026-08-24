/**
 * @format
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { StatBar } from '../src/components/stat-bar';

async function fillWidthFor(value: number) {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    tree = ReactTestRenderer.create(<StatBar label="HP" value={value} colourType="grass" />);
  });
  // The mount effect has set the (mocked) shared value to its settled state; a re-render
  // makes the animated style recompute with it.
  await act(async () => {
    tree.update(<StatBar label="HP" value={value} colourType="grass" />);
  });
  const widths = tree.root
    .findAll(n => Array.isArray(n.props.style))
    .flatMap(n => n.props.style.flat())
    .filter(st => st && typeof st === 'object' && typeof st.width === 'string')
    .map(st => st.width);
  await act(async () => tree.unmount());
  return widths[0];
}

test('a stat past the scale clamps to a full bar', async () => {
  expect(await fillWidthFor(200)).toBe('100%');
});

test('a zero stat renders an empty bar, not a negative one', async () => {
  expect(await fillWidthFor(0)).toBe('0%');
});
