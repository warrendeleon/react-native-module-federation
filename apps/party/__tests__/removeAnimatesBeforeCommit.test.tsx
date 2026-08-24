/**
 * @format
 */

import React from 'react';
import { LayoutAnimation } from 'react-native';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { addToParty, rootReducer, type PartySliceShape } from '@pokedex/contracts';

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

// Removing a member must configure the spring BEFORE the store changes: LayoutAnimation
// applies to the next layout pass, so a configure that lands after the shrunken grid has
// re-rendered animates nothing. The screen configures in the same tick as the dispatch,
// inside the tap handler — never during render, a phase React may restart or abandon.
test('remove configures the spring before the store shrinks the grid', async () => {
  const order: string[] = [];
  jest.spyOn(LayoutAnimation, 'configureNext').mockImplementation(() => {
    order.push('configure');
  });

  const store = configureStore({ reducer: rootReducer });
  const PartyScreen = require('../src/PartyScreen').default as React.ComponentType;
  store.subscribe(() => {
    order.push('state-change');
  });
  await act(async () => {
    store.dispatch(
      addToParty({ id: 7, name: 'Squirtle', types: ['water'], spriteUri: 'sprite://7' }),
    );
  });

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

  order.length = 0;
  const removeControl = tree.root
    .findAll(node => typeof node.type === 'string' && node.props.accessible === false)
    .find(node => typeof node.props.onClick === 'function' || typeof node.props.onPress === 'function');
  const removeHandler = removeControl?.props.onPress ?? removeControl?.props.onClick;
  expect(typeof removeHandler).toBe('function');
  await act(async () => {
    removeHandler();
  });

  expect(order[0]).toBe('configure');
  expect(order).toContain('state-change');
  expect(order.indexOf('configure')).toBeLessThan(order.indexOf('state-change'));
  expect((store.getState() as PartySliceShape).party?.members).toHaveLength(0);
});
