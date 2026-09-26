/**
 * @format
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { RemoteBoundary } from '../App';
import * as federation from '../src/shell/scriptManager';

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

// The words under the title follow where this launch loads remotes from. A Release build served
// from the CDN has no dev server, so advice to check one would be wrong in exactly the build
// users run; the refused chunk and the missing version both land here.
test.each([
  ['dev', /dev server/],
  ['cdn', /downloaded or verified/],
  ['unresolved', /which version/],
] as const)('in %s mode the error state says what to try there', async (mode, advice) => {
  const status = jest
    .spyOn(federation, 'getFederationStatus')
    .mockReturnValue({ mode, source: '', versions: {} });
  const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  let tree!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    tree = ReactTestRenderer.create(
      <RemoteBoundary load={() => Promise.reject(new Error('refused'))} />,
    );
  });
  expect(texts(tree).some(t => advice.test(t))).toBe(true);
  if (mode !== 'dev') {
    expect(texts(tree).some(t => /dev server/.test(t))).toBe(false);
  }
  await act(async () => {
    tree.unmount();
  });
  status.mockRestore();
  warn.mockRestore();
});
