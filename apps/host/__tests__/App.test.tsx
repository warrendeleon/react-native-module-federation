/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import type { PartySliceShape } from '@pokedex/contracts';
import App from '../App';
import { getFederationStatus, initializeFederation } from '../src/shell/scriptManager';
import { store } from '../src/store';

// The federated partyApp/partySlice specifier resolves to the mock in __mocks__, which
// performs the real module's side effect: injecting the party reducer. That lets this
// test prove the whole boot sequence rather than swallowing a failed import.
//
// The sequence gained a step in the version-map post: nothing federated is imported until
// initializeFederation has settled, so the state module's load now waits behind the boot gate.
// That is why the render is flushed twice below — the first pass opens the gate and mounts the
// shell, the second runs the shell's own effect. A single pass would leave the slice missing,
// which is the failure this test would report if the gate ever stopped opening.
test('boot readiness: the gate opens, the state module loads, the marker surfaces the slice', async () => {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(<App />);
  });
  await ReactTestRenderer.act(async () => {});

  // The boot effect's then-chain has run: import resolved, reducer injected,
  // partyStateReady dispatched, so the slice is surfaced in state. If the import
  // had failed and been caught, state.party would still be undefined and this
  // test would say so instead of passing silently.
  expect((store.getState() as PartySliceShape).party).toEqual({ members: [] });

  await ReactTestRenderer.act(async () => {
    tree.unmount();
  });
});

// The gate's own contract, stated separately from the party slice's: with no CDN configured a
// development build resolves to the dev servers, and it resolves rather than hanging. A gate
// that never settles is a splash screen that never lifts, and it would otherwise show up here
// only as the previous test failing for an unrelated-looking reason.
test('the boot gate settles on dev mode when no CDN is configured', async () => {
  const status = await initializeFederation();
  expect(status).toEqual({ mode: 'dev', source: 'dev servers', versions: {} });
  expect(getFederationStatus()).toBe(status);
});

// Callers share one initialisation rather than one flag. A flag set before the probe is awaited
// would let a second caller arriving mid-probe through with the state from before it started,
// which for a release build means reading dev mode and loading nothing.
test('a second caller waits for the first initialisation rather than starting its own', () => {
  expect(initializeFederation()).toBe(initializeFederation());
});
