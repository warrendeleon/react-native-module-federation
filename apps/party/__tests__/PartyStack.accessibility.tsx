// --- The Party remote checked against the same bar.
//
// Same preset, same helpers, different screens. Like the Pokédex suite, this renders the real
// PartyScreen through the real store and navigator: what this team owns is the grid it composes
// out of the design system, not the design system's own components, and a suite that mounts
// PokemonCard directly would be testing somebody else's package.
//
// What is specific here is a grid of six slots that are either a member or a gap, and a
// per-slot removal that is deliberately not a separate stop in the accessibility tree.

import React from 'react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { addToParty, rootReducer } from '@pokedex/contracts';
import { createThemedRender, expectAccessibilityProps } from '@pokedex/a11y-testing';

import PartyStack from '../src/PartyStack';

jest.useFakeTimers();

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

const members = [
  { uid: 'a', id: 25, name: 'Pikachu', types: ['Electric'], spriteUri: 'sprite://25' },
  { uid: 'b', id: 1, name: 'Bulbasaur', types: ['Grass', 'Poison'], spriteUri: 'sprite://1' },
];

const renderWithTheme = createThemedRender(require('@pokedex/ui/tailwind.preset.js'));

async function renderScreen(party: typeof members) {
  // The real slice, filled through the real contract action. Injecting a stub reducer would be
  // overwritten anyway: importing PartyStack runs partySlice's own injection side effect, which
  // is the mechanism post 8 is about. Dispatching addToParty is also what the Pokédex does, so
  // the grid under test is assembled the way it is assembled in the app.
  const store = configureStore({ reducer: rootReducer });
  for (const member of party) {
    store.dispatch(addToParty(member));
  }
  return renderWithTheme(
    <Provider store={store}>
      <SafeAreaProvider initialMetrics={metrics}>
        <NavigationContainer>
          <PartyStack />
        </NavigationContainer>
      </SafeAreaProvider>
    </Provider>,
  );
}

afterEach(() => {
  jest.runOnlyPendingTimers();
});

describe('WCAG 4.1.2 Name, Role, Value — a filled party slot', () => {
  test('a member slot the screen renders is a button that names its Pokémon', async () => {
    const { getByLabelText } = await renderScreen(members);
    expectAccessibilityProps(getByLabelText(/^Pikachu, number 025/), { role: 'button' });
  });

  // The ✕ badge is small, and making it a second focus stop next to the card it sits on would
  // double the number of things to swipe past on a full party. The design system hides it from
  // the tree and exposes removal as an action on the card instead, which is how a screen-reader
  // user reaches it: rotor, "Remove from party", double tap. The check is that the action
  // exists at all: a hidden control with no action behind it would be unreachable.
  test('removal is reachable as an action on the slot, not as a hidden button', async () => {
    const { getByLabelText } = await renderScreen(members);
    expect(getByLabelText(/^Pikachu, number 025/).props.accessibilityActions).toEqual([
      { name: 'remove', label: 'Remove from party' },
    ]);
  });
});

describe('WCAG 1.1.1 Non-text Content — the empty slots', () => {
  // An empty slot is a gap, not a control. It still says which gap it is, so someone moving
  // through the grid knows where they are rather than hearing four identical silences.
  test('the screen fills the grid to six and names each empty slot', async () => {
    const { getByLabelText } = await renderScreen(members);
    for (const n of [3, 4, 5, 6]) {
      expect(getByLabelText(`Empty party slot ${n}`)).toBeTruthy();
    }
  });

  test('an empty slot is not announced as a button', async () => {
    const { queryByLabelText } = await renderScreen(members);
    expect(queryByLabelText('Empty party slot 3')?.props.accessibilityRole).toBeUndefined();
  });
});

describe('WCAG 1.3.1 Info and Relationships — an empty party', () => {
  test('an empty party is six named gaps, not one undifferentiated blank', async () => {
    const { getByLabelText } = await renderScreen([]);
    for (const n of [1, 2, 3, 4, 5, 6]) {
      expect(getByLabelText(`Empty party slot ${n}`)).toBeTruthy();
    }
  });
});
