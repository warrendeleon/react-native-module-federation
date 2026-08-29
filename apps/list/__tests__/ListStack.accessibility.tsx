// --- The Pokédex remote checked against the same bar as everything else.
//
// The design system's own suite proves the tokens and the components. What is left is what only
// this team can check: the screens they compose out of them. So this file renders the real
// PokedexScreen through the real navigator and the real store, rather than mounting a design
// system component and calling it a screen. An earlier version did the latter, which meant it
// re-tested a card's label format that was already settled at the source and never once
// exercised anything this app owns.
//
// Nothing here re-checks what packages/ui already proves. These tests are about composition:
// that rows built from the app's own query data carry labels, that the states a user can land
// in are reachable, and that the party counter announces itself.

import React from 'react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { baseApi, partyStateReady, rootReducer } from '@pokedex/contracts';
import {
  createThemedRender,
  expectAccessibilityProps,
  expectMinTouchTarget,
  expectScreenReaderAnnouncement,
} from '@pokedex/a11y-testing';

import ListStack from '../src/ListStack';

// A slice of what the list endpoint returns. The screen maps over it, so these rows reach the
// accessibility tree the same way live data would.
const rows = [
  { id: 1, name: 'Bulbasaur', spriteUri: 'sprite://1' },
  { id: 25, name: 'Pikachu', spriteUri: 'sprite://25' },
];

type ListState = {
  data?: typeof rows;
  isLoading: boolean;
  isError: boolean;
  isFetching: boolean;
  refetch: () => void;
};

const defaultListState: ListState = {
  data: rows,
  isLoading: false,
  isError: false,
  isFetching: false,
  refetch: jest.fn(),
};

// The factory is hoisted above every binding in this file, so it cannot close over an ordinary
// variable. Jest allows one prefixed with `mock`, on the understanding that it is assigned
// before the mocked module is first required — which beforeEach does.
let mockListState: ListState = defaultListState;

jest.mock('../src/listApi', () => ({
  useGetPokemonListQuery: () => mockListState,
}));

jest.mock('../src/typesApi', () => ({
  useGetPokemonTypesQuery: () => ({
    data: { 1: ['Grass', 'Poison'], 25: ['Electric'] },
    isFetching: false,
  }),
}));

jest.useFakeTimers();

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

const renderWithTheme = createThemedRender(require('@pokedex/ui/tailwind.preset.js'));

/** The nearest ancestor that declares a live region: what a screen reader actually watches. */
function liveRegionAround(node: unknown) {
  let current = node as { parent: unknown; props?: Record<string, unknown> } | null;
  while (current) {
    if (current.props?.accessibilityLiveRegion || current.props?.accessibilityRole === 'alert') {
      return current;
    }
    current = current.parent as typeof current;
  }
  throw new Error('Nothing around that text declares a live region.');
}

/** The nearest ancestor that declares a size: what a finger actually lands on. */
function buttonContaining(node: { parent: unknown } | null) {
  let current = node as { parent: unknown; props?: { style?: unknown } } | null;
  while (current) {
    const style = current.props?.style;
    if (style && !Array.isArray(style) && typeof style === 'object' && 'minHeight' in style) {
      return current;
    }
    current = current.parent as typeof current;
  }
  throw new Error('No ancestor of that text declares a size.');
}

function setListState(state: Partial<ListState>) {
  mockListState = { ...defaultListState, ...state };
}

// The party slice belongs to the other remote, so this app only ever sees it injected. It is
// injected once, because rootReducer.inject ignores a second registration at the same path, and
// the members it reports come from here — the shape post 8 established: inject, then surface it
// with the marker the host dispatches.
let injectedParty: unknown[] = [];
rootReducer.inject({ reducerPath: 'party', reducer: () => ({ members: injectedParty }) });

async function renderScreen({ party = [] as unknown[] } = {}) {
  injectedParty = party;
  const store = configureStore({
    reducer: rootReducer,
    middleware: gdm => gdm().concat(baseApi.middleware),
  });
  store.dispatch(partyStateReady());
  const result = await renderWithTheme(
    <Provider store={store}>
      <SafeAreaProvider initialMetrics={metrics}>
        <NavigationContainer>
          <ListStack />
        </NavigationContainer>
      </SafeAreaProvider>
    </Provider>,
  );
  return result;
}

beforeEach(() => setListState({}));

afterEach(() => {
  jest.runOnlyPendingTimers();
});

describe('WCAG 4.1.2 Name, Role, Value — the Pokédex rows', () => {
  test.each(rows)('the $name row the screen builds is a button that names itself', async row => {
    const { getByLabelText } = await renderScreen();
    expectAccessibilityProps(getByLabelText(new RegExp(`^${row.name}, number `)), {
      role: 'button',
    });
  });

  test('every row the screen renders is reachable as a button', async () => {
    const { getAllByRole } = await renderScreen();
    const labels = getAllByRole('button').map(b => b.props.accessibilityLabel);
    for (const row of rows) {
      expect(labels.some((l: string) => l?.startsWith(`${row.name}, number `))).toBe(true);
    }
  });
});

describe('WCAG 4.1.3 Status Messages — the states this screen can land in', () => {
  test('a failed load announces itself and is not just a picture of an error', async () => {
    setListState({ isError: true, data: undefined });
    const { getByRole } = await renderScreen();
    expectScreenReaderAnnouncement(getByRole('alert'), { politeness: 'assertive' });
  });

  test('a loading screen announces politely rather than interrupting', async () => {
    setListState({ isLoading: true, data: undefined });
    const { getByText } = await renderScreen();
    // The caption is the announceable content; the spinner conveys nothing on its own. Asserting
    // only that the text is on screen would pass with the live region removed, which is the one
    // thing this test is named for.
    const caption = getByText(/Loading/i);
    expectScreenReaderAnnouncement(liveRegionAround(caption), { politeness: 'polite' });
  });

  // The party count is the one thing on this screen that changes without the user moving focus,
  // which is exactly what SC 4.1.3 is about.
  test('the party counter is a live region, so a change is announced', async () => {
    const { getByLabelText } = await renderScreen({ party: [{ uid: 'a' }, { uid: 'b' }] });
    const counter = getByLabelText(/party/i);
    expectScreenReaderAnnouncement(counter, { politeness: 'polite' });
    // Without `accessible` the header is a container of two text nodes rather than one element
    // the platform can announce, and the live region has nothing to attach to.
    expect(counter.props.accessible).toBe(true);
  });

  // Two party sizes, because one fixture cannot tell a spoken count from a constant: an earlier
  // version asserted "2 of 6" against a two-member party and passed with the number hard-coded.
  test.each([
    [[{ uid: 'a' }, { uid: 'b' }], /2 of 6/i],
    [[{ uid: 'a' }], /1 of 6/i],
    [[], /0 of 6/i],
  ])('the counter speaks the count it is showing', async (party, expected) => {
    const { getByLabelText } = await renderScreen({ party });
    expect(getByLabelText(expected)).toBeTruthy();
  });
});

describe('WCAG 2.5.5 Target Size — the error state', () => {
  // The retry is the way back from a failed load, so it is the one control on this screen that
  // must never be hard to hit. What it recovers depends on what failed: a data request retries
  // cleanly, while a remote that never answered also needs the federation runtime's cached
  // manifest failure cleared, which the resilience post later in the series builds.
  test('the retry button clears the 44pt bar on both axes', async () => {
    setListState({ isError: true, data: undefined });
    const { getByText } = await renderScreen();
    // Named rather than picked by role: the header's theme toggle is a button too, and a query
    // that would break the day a second control appears is a query that tests the fixture.
    // This passes because the design system declares the size on ErrorState's button, not
    // because this app did anything. One package release, every remote's retry covered.
    // The check is on the declared size; what the control finally occupies after layout and
    // clipping is the native audit layer's job.
    expectMinTouchTarget(buttonContaining(getByText('Try again')));
  });
});
