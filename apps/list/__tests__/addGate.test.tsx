/**
 * @format
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { NavigationContainer } from '@react-navigation/native';
import { PokemonDetailView } from '@pokedex/detail';
import { baseApi, partyStateReady, rootReducer } from '@pokedex/contracts';

import ListStack from '../src/ListStack';

// The detail data is not what this test is about; the query hook resolves instantly.
jest.mock('../src/detailApi', () => ({
  useGetPokemonDetailQuery: () => ({
    data: { id: 1, name: 'Bulbasaur', spriteUri: 'sprite://1', types: ['grass'] },
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  }),
}));

// Fake timers keep the navigator's scheduled work inside the test's lifetime, so nothing
// fires after Jest tears the environment down.
jest.useFakeTimers();

test('Add stays disabled until partyStateReady surfaces the injected slice', async () => {
  const store = configureStore({
    reducer: rootReducer,
    middleware: gdm => gdm().concat(baseApi.middleware),
  });

  let tree!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    tree = ReactTestRenderer.create(
      <Provider store={store}>
        <NavigationContainer
          initialState={{
            routes: [
              { name: 'PokedexList' },
              { name: 'PokemonDetail', params: { id: 1 } },
            ],
            index: 1,
          }}>
          <ListStack />
        </NavigationContainer>
      </Provider>,
    );
  });

  const view = () => tree.root.findByType(PokemonDetailView);

  // The slice's module has not loaded: the gate holds the button down.
  expect(view().props.addDisabled).toBe(true);

  // The party module lands: its reducer injects, and the host's marker surfaces it.
  await act(async () => {
    rootReducer.inject({ reducerPath: 'party', reducer: () => ({ members: [] }) });
    store.dispatch(partyStateReady());
  });

  // The gate lifts.
  expect(view().props.addDisabled).toBe(false);

  tree.unmount();
});
