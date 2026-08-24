/**
 * @format
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PokemonDetailView } from '@pokedex/detail';
import { addToParty, baseApi, partyStateReady, rootReducer } from '@pokedex/contracts';

import ListStack from '../src/ListStack';

jest.mock('../src/detailApi', () => ({
  useGetPokemonDetailQuery: () => ({
    data: {
      id: 7,
      name: 'Squirtle',
      spriteUri: 'sprite://7',
      types: ['Water'],
      heightM: 0.5,
      weightKg: 9,
      abilities: ['Torrent'],
      stats: [{ name: 'hp', value: 44 }],
    },
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  }),
}));

// The toast is the observable confirmation; capture what the container reports.
jest.mock('@pokedex/ui', () => {
  const actual = jest.requireActual('@pokedex/ui');
  return { ...actual, toast: jest.fn() };
});
const mockedUi = jest.requireMock('@pokedex/ui') as { toast: jest.Mock };
const toast = mockedUi.toast;

jest.useFakeTimers();

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

test('two taps at five members: one member joins and one honest rejection', async () => {
  const store = configureStore({
    reducer: rootReducer,
    middleware: gdm => gdm().concat(baseApi.middleware),
  });
  // The party app's REAL slice, not a lookalike: importing it injects the owner's reducer
  // into the shared rootReducer (the Jest mapping above makes both sides resolve one
  // contracts instance), so a change to the owner's cap logic fails this test.
  require('../../party/src/partySlice');
  store.dispatch(partyStateReady());
  // Fill to five through the reducer itself.
  for (let i = 1; i <= 5; i += 1) {
    store.dispatch(
      addToParty({ id: i, name: `Member ${i}`, spriteUri: `sprite://${i}`, types: ['Normal'] }),
    );
  }

  let tree!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    tree = ReactTestRenderer.create(
      <Provider store={store}>
        <SafeAreaProvider initialMetrics={metrics}>
          <NavigationContainer
            initialState={{
              routes: [{ name: 'PokedexList' }, { name: 'PokemonDetail', params: { id: 7 } }],
              index: 1,
            }}>
            <ListStack />
          </NavigationContainer>
        </SafeAreaProvider>
      </Provider>,
    );
  });

  const view = tree.root.findByType(PokemonDetailView);
  // Two taps before React re-renders the disabled state: both handlers run against the
  // same stale render.
  await act(async () => {
    view.props.onAddToParty();
    view.props.onAddToParty();
  });

  const members = (store.getState() as { party?: { members: unknown[] } }).party?.members;
  expect(members).toHaveLength(6);
  expect(toast).toHaveBeenCalledTimes(2);
  expect(toast).toHaveBeenNthCalledWith(1, 'Squirtle joined your party', expect.any(Object));
  expect(toast).toHaveBeenNthCalledWith(2, 'Your party is full', expect.any(Object));

  await act(async () => {
    tree.unmount();
  });
  await act(async () => {
    jest.runOnlyPendingTimers();
  });
});
