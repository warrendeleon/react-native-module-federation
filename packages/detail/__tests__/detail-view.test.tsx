/**
 * @format
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import type { PokemonDetail } from '@pokedex/contracts';
import { PokemonDetailView } from '../src';

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

const bulbasaur: PokemonDetail = {
  id: 1,
  name: 'Bulbasaur',
  spriteUri: 'sprite://1',
  types: ['Grass', 'Poison'],
  heightM: 0.7,
  weightKg: 6.9,
  abilities: ['Overgrow'],
  stats: [{ name: 'HP', value: 45 }],
  flavourText: 'A strange seed was planted on its back at birth.',
};

async function render(props: React.ComponentProps<typeof PokemonDetailView>) {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    tree = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={metrics}>
        <PokemonDetailView {...props} />
      </SafeAreaProvider>,
    );
  });
  return tree;
}

function texts(tree: ReactTestRenderer.ReactTestRenderer) {
  return tree.root.findAll(n => typeof n.props.children === 'string').map(n => n.props.children);
}

test('the loading state shows the spinner and none of the data', async () => {
  const tree = await render({ loading: true, error: false, onRetry: jest.fn() });
  // The spinner is an ActivityIndicator under the hood; its presence is the state.
  const spinners = tree.root.findAll(
    n => String(n.type) === 'ActivityIndicator' || n.props.accessibilityRole === 'progressbar',
  );
  expect(spinners.length).toBeGreaterThan(0);
  expect(texts(tree)).not.toContain('Bulbasaur');
  await act(async () => tree.unmount());
});

test('the error state offers the retry the consumer wired', async () => {
  const onRetry = jest.fn();
  const tree = await render({ loading: false, error: true, onRetry });
  const pressables = tree.root.findAll(n => typeof n.props.onPress === 'function');
  expect(pressables.length).toBeGreaterThan(0);
  await act(async () => {
    pressables[0].props.onPress();
  });
  expect(onRetry).toHaveBeenCalled();
  await act(async () => tree.unmount());
});

test('the data state renders the whole model it is handed', async () => {
  const tree = await render({ pokemon: bulbasaur, loading: false, error: false, onRetry: jest.fn() });
  const t = texts(tree);
  expect(t).toContain('Bulbasaur');
  expect(t).toContain('A strange seed was planted on its back at birth.');
  expect(t).toContain('Grass');
  expect(t).toContain('Poison');
  expect(t.join(' ')).toMatch(/0\.7\s?m/);
  expect(t.join(' ')).toMatch(/6\.9\s?kg/);
  expect(t).toContain('Overgrow');
  expect(t).toContain('HP');
  await act(async () => tree.unmount());
});

test('a wired Add renders the consumer\'s label and disabled state', async () => {
  const onAddToParty = jest.fn();
  const tree = await render({
    pokemon: bulbasaur,
    loading: false,
    error: false,
    onRetry: jest.fn(),
    onAddToParty,
    addDisabled: true,
    addLabel: 'Party is full',
  });
  const t = texts(tree);
  expect(t).toContain('Party is full');
  await act(async () => tree.unmount());
});

test('no Add button renders unless a consumer wires the write', async () => {
  const without = await render({ pokemon: bulbasaur, loading: false, error: false, onRetry: jest.fn() });
  const labels = without.root.findAll(n => typeof n.props.children === 'string' && /Add to party/.test(n.props.children));
  expect(labels).toHaveLength(0);
  await act(async () => without.unmount());
});
