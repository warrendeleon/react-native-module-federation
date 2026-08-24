/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import type { PartySliceShape } from '@pokedex/contracts';
import App from '../App';
import { store } from '../src/store';

// The federated partyApp/partySlice specifier resolves to the mock in __mocks__, which
// performs the real module's side effect: injecting the party reducer. That lets this
// test prove the whole boot sequence rather than swallowing a failed import.
test('boot readiness: the state module loads and the marker surfaces the slice', async () => {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(<App />);
  });

  // The boot effect's then-chain has run: import resolved, reducer injected,
  // partyStateReady dispatched, so the slice is surfaced in state. If the import
  // had failed and been caught, state.party would still be undefined and this
  // test would say so instead of passing silently.
  expect((store.getState() as PartySliceShape).party).toEqual({ members: [] });

  await ReactTestRenderer.act(async () => {
    tree.unmount();
  });
});
