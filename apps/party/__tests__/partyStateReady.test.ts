/**
 * @format
 */

import { configureStore } from '@reduxjs/toolkit';
import {
  addToParty,
  partyStateReady,
  rootReducer,
  type PartySliceShape,
} from '@pokedex/contracts';

const bulbasaur = { id: 1, name: 'Bulbasaur', spriteUri: 'sprite://1' };

test('an add before the slice module loads vanishes; the marker closes the window', () => {
  const store = configureStore({ reducer: rootReducer });

  // Before the party module loads, a dispatched add has no reducer to answer it.
  store.dispatch(addToParty(bulbasaur));
  expect((store.getState() as PartySliceShape).party).toBeUndefined();

  // Importing the slice module injects the reducer, but inject() never dispatches,
  // so the state still carries no party key. This is the gap the marker exists for.
  require('../src/partySlice');
  expect((store.getState() as PartySliceShape).party).toBeUndefined();

  // The marker is the next action through the rebuilt reducer: state.party appears.
  store.dispatch(partyStateReady());
  expect((store.getState() as PartySliceShape).party).toEqual({ members: [] });

  // And the same add, dispatched after readiness, lands.
  store.dispatch(addToParty(bulbasaur));
  const members = (store.getState() as PartySliceShape).party?.members;
  expect(members).toHaveLength(1);
  expect(members?.[0].name).toBe('Bulbasaur');
});
