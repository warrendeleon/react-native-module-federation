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
import { act, createThemedRender, expectAccessibilityProps } from '@pokedex/a11y-testing';

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

/** The pressable that owns a piece of text: what a screen reader would actually land on. */
function pressableAround(node: unknown): { props: Record<string, unknown> } {
  let current = node as { parent: unknown; props?: Record<string, unknown> } | null;
  while (current) {
    if (current.props && typeof current.props.onPress === 'function') {
      return { props: current.props };
    }
    current = current.parent as typeof current;
  }
  throw new Error('No pressable ancestor of that text.');
}

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
    const slot = getByLabelText(/^Pikachu, number 025/);
    expect(slot.props.accessibilityActions).toEqual([
      { name: 'remove', label: 'Remove from party' },
    ]);
    // Advertising the action is half of it. A rotor entry with nothing behind it is worse than
    // no entry, because it tells a screen-reader user the control exists and then does nothing.
    expect(typeof slot.props.onAccessibilityAction).toBe('function');
  });

  test('the visible remove badge stays out of the accessibility tree', async () => {
    const { getAllByText, queryByText } = await renderScreen(members);
    // The ✕ is deliberately hidden so the rotor does not carry two stops per slot. If it came
    // back into the tree the action above would be a duplicate, not a convenience.
    //
    // This asserts the badge's own props. An earlier version walked the slot looking for a
    // descendant whose accessibilityLabel matched /remove/i, which the badge has never carried:
    // it is hidden, not labelled. So the search found nothing whether the hiding props were
    // there or not, and stripping all three of them left the test green — a check measuring
    // something adjacent to what it names, which is the fault this whole suite exists to catch.
    // The behavioural half: the library's default queries model what a screen reader reaches,
    // so a ✕ that is genuinely hidden is simply not found.
    expect(queryByText('✕')).toBeNull();

    // And the declarative half, on the element itself, because "not found" alone would also be
    // satisfied by a badge that had stopped rendering. Both platforms, not one: iOS reads
    // accessibilityElementsHidden and Android reads importantForAccessibility, so either one
    // alone leaves the badge exposed on the other.
    const badges = getAllByText('✕', { includeHiddenElements: true }).map(pressableAround);
    expect(badges).toHaveLength(members.length);
    for (const badge of badges) {
      expect(badge.props.accessible).toBe(false);
      expect(badge.props.accessibilityElementsHidden).toBe(true);
      expect(badge.props.importantForAccessibility).toBe('no-hide-descendants');
    }
  });

  test('firing the action actually removes the member', async () => {
    const { getByLabelText, queryByLabelText } = await renderScreen(members);
    await act(async () => {
      getByLabelText(/^Pikachu, number 025/).props.onAccessibilityAction({
        nativeEvent: { actionName: 'remove' },
      });
    });
    expect(queryByLabelText(/^Pikachu, number 025/)).toBeNull();
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
    const { getByLabelText } = await renderScreen(members);
    // getBy, not queryBy with optional chaining: `queryByLabelText(...)?.props.role` is
    // undefined both when the slot correctly claims no role and when the slot is missing
    // entirely, so it passed for a regression that deleted it.
    //
    // Both spellings, because React Native accepts either and the platform reads either. An
    // earlier version asserted only `accessibilityRole`, so adding `role="button"` to the slot
    // left this green while a screen reader announced it as a button.
    const slot = getByLabelText('Empty party slot 3');
    expect(slot.props.accessibilityRole ?? slot.props.role).toBeUndefined();
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
