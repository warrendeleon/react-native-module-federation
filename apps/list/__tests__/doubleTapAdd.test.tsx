/**
 * @format
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Provider } from 'react-redux';
import { configureStore, createSlice } from '@reduxjs/toolkit';
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
  // The real party reducer shape with the cap enforced, injected the way the owner injects it.
  const partySlice = createSlice({
    name: 'party',
    initialState: {
      members: Array.from({ length: 5 }, (_, i) => ({
        uid: `u${i}`,
        id: i + 1,
        name: `Member ${i + 1}`,
        spriteUri: `sprite://${i + 1}`,
        types: ['Normal'],
      })),
    },
    reducers: {},
    extraReducers: builder => {
      builder.addCase(addToParty, (state, { payload }) => {
        if (state.members.length >= 6) {
          return;
        }
        state.members.push(payload);
      });
    },
  });
  const store = configureStore({
    reducer: rootReducer,
    middleware: gdm => gdm().concat(baseApi.middleware),
  });
  rootReducer.inject(partySlice, { overrideExisting: true });
  store.dispatch(partyStateReady());

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
