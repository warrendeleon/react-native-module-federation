/**
 * @format
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { rootReducer, type PartySliceShape } from '@pokedex/contracts';

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

// The path where the host's boot import failed: nothing has dispatched the marker, and the
// slice arrives only because opening this tab imports the module. The screen must surface
// the state itself, or the Pokédex's Add stays disabled until an unrelated action runs.
test('opening the Party tab surfaces the slice without the boot marker', async () => {
  // The store exists FIRST, the way the host's store exists before any remote loads. Only
  // then does opening the tab import the screen, whose module chain runs partySlice's
  // injection side effect — after store creation, so the slice is injected but unsurfaced.
  const store = configureStore({ reducer: rootReducer });
  const PartyScreen = require('../src/PartyScreen').default as React.ComponentType;
  expect((store.getState() as PartySliceShape).party).toBeUndefined();

  let tree!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    tree = ReactTestRenderer.create(
      <Provider store={store}>
        <SafeAreaProvider initialMetrics={metrics}>
          <NavigationContainer>
            <PartyScreen />
          </NavigationContainer>
        </SafeAreaProvider>
      </Provider>,
    );
  });

  // The screen's own effect dispatched partyStateReady: the slice is now visible to every
  // consumer, without waiting for another action.
  expect((store.getState() as PartySliceShape).party).toEqual({ members: [] });

  await act(async () => {
    tree.unmount();
  });
});
