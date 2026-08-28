// --- The shared view carries its own accessibility suite.
//
// This package ships one screen to two apps that never import each other. If the screen is
// checked here, at the source, both consumers inherit the result — and when something fails, one
// patch release heals both of them without either team touching their code.
//
// The tests hand the view its props directly. That is the same seam the List and Party apps use
// to feed it, so nothing here needs a store, a query client or a navigator.

import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import type { PokemonDetail } from '@pokedex/contracts';
import {
  createThemedRender,
  expectAccessibilityProps,
  expectMinTouchTarget,
} from '@pokedex/a11y-testing';

import { PokemonDetailView } from '../src';

const renderWithTheme = createThemedRender(require('@pokedex/ui/tailwind.preset.js'));

// The safe-area metrics a device would supply. Without a provider the styling stack's
// safe-area shim has no component to read, which is a test-environment detail rather than
// anything the screen does.
const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

const charizard: PokemonDetail = {
  id: 6,
  name: 'Charizard',
  spriteUri: 'sprite://6',
  types: ['Fire', 'Flying'],
  heightM: 1.7,
  weightKg: 90.5,
  abilities: ['Blaze'],
  stats: [
    { name: 'HP', value: 78 },
    { name: 'Attack', value: 84 },
    { name: 'Speed', value: 100 },
  ],
  flavourText: 'It spits fire hot enough to melt boulders.',
};

function view(overrides: Partial<React.ComponentProps<typeof PokemonDetailView>> = {}) {
  return (
    <SafeAreaProvider initialMetrics={metrics}>
      <PokemonDetailView pokemon={charizard} {...overrides} />
    </SafeAreaProvider>
  );
}

describe('WCAG 4.1.2 Name, Role, Value — the Add action', () => {
  test('the enabled Add button announces itself as a button', async () => {
    const { getByRole } = await renderWithTheme(view({ onAddToParty: () => {} }));
    expectAccessibilityProps(getByRole('button'), { role: 'button' });
  });

  // The state a screen reader reports is the half that no visual review catches: the button
  // greys out on screen whatever it announces, so a sighted reviewer signs it off either way.
  test('the disabled Add button reports that it is disabled', async () => {
    const { getByRole } = await renderWithTheme(
      view({ onAddToParty: () => {}, addDisabled: true, addLabel: 'Party is full' }),
    );
    expectAccessibilityProps(getByRole('button'), {
      role: 'button',
      state: { disabled: true },
    });
  });
});

describe('WCAG 2.5.5 Target Size — the Add action', () => {
  // 44pt is Apple's recommended default control size, adopted as this project's bar. It is not
  // the AA requirement: SC 2.5.5 is Level AAA, and WCAG 2.2's AA criterion (2.5.8) asks for
  // 24x24. Clearing 44 clears both, and Android's 48dp guidance is the one to watch on that side.
  test('the Add button is at least 44pt tall', async () => {
    const { getByRole } = await renderWithTheme(view({ onAddToParty: () => {} }));
    expectMinTouchTarget(getByRole('button'));
  });
});

describe('WCAG 1.1.1 Non-text Content — the sprite', () => {
  test('the hero sprite is either labelled or explicitly decorative', async () => {
    const { getByRole, queryByRole } = await renderWithTheme(view());
    const image = queryByRole('image') ?? queryByRole('img');
    if (image) {
      // If it is exposed at all, it must say what it is.
      expectAccessibilityProps(image, { label: expect.stringContaining('Charizard') as never });
    } else {
      // Hidden from the tree is the other valid answer for art that repeats the heading.
      expect(getByRole('header')).toBeTruthy();
    }
  });
});

describe('WCAG 1.4.1 Use of Color — the stat rows', () => {
  test('each stat is readable as a number, not only as a coloured bar', async () => {
    const { getAllByRole } = await renderWithTheme(view());
    const bars = getAllByRole('progressbar');
    expect(bars.length).toBe(charizard.stats.length);
    for (const bar of bars) {
      expect(bar.props.accessibilityValue?.text).toEqual(expect.any(String));
    }
  });
});
