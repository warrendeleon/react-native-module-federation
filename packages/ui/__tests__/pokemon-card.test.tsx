/**
 * @format
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { PokemonCard } from '../src/components/pokemon-card';

async function labelFor(types: string[]) {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    tree = ReactTestRenderer.create(
      <PokemonCard id={1} name="Bulbasaur" types={types} spriteUri="sprite://1" />,
    );
  });
  const pressable = tree.root.findAll(n => Boolean(n.props.accessibilityLabel))[0];
  const label = pressable.props.accessibilityLabel as string;
  await act(async () => tree.unmount());
  return label;
}

test('a dual-type card announces its types in the plural', async () => {
  expect(await labelFor(['Grass', 'Poison'])).toBe('Bulbasaur, number 001, Grass and Poison types');
});

test('a single-type card announces the singular', async () => {
  expect(await labelFor(['Electric'])).toBe('Bulbasaur, number 001, Electric type');
});

test('a card with degraded type data stops at the number', async () => {
  expect(await labelFor([])).toBe('Bulbasaur, number 001');
});
