/**
 * @format
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { RemoteBoundary } from '../App';

function texts(tree: ReactTestRenderer.ReactTestRenderer) {
  return tree.root.findAll(n => typeof n.props.children === 'string').map(n => n.props.children);
}

// What Jest can prove: the boundary catches a rejected import, degrades to the error state,
// and Try again runs a FRESH import instead of re-throwing React.lazy's cached rejection.
// What only a device can prove: the federation runtime's own transport. The load function
// here stands where the federated import stands, failing once and succeeding on retry.
test('a dead remote degrades to the error state and Try again recovers with a fresh import', async () => {
  let attempts = 0;
  const load = () => {
    attempts += 1;
    if (attempts === 1) {
      return Promise.reject(new Error('manifest unreachable'));
    }
    return Promise.resolve({ default: () => <></> });
  };

  let tree!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    tree = ReactTestRenderer.create(<RemoteBoundary load={load} />);
  });
  // The rejection has been caught: the fallback offers the retry.
  expect(texts(tree)).toContain('This tab could not load');
  const retry = tree.root.findAll(n => typeof n.props.onPress === 'function')[0];
  expect(retry).toBeDefined();

  await act(async () => {
    retry.props.onPress();
  });
  // A fresh import ran (the cached rejection was discarded) and the tab recovered.
  expect(attempts).toBe(2);
  expect(texts(tree)).not.toContain('This tab could not load');

  await act(async () => {
    tree.unmount();
  });
});
