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

const retryButton = (tree: ReactTestRenderer.ReactTestRenderer) =>
  tree.root.findAll(n => typeof n.props.onPress === 'function')[0];

// What Jest can prove: which way the boundary goes for each kind of failure, and that a retry runs
// a fresh load rather than re-throwing React.lazy's cached rejection. What only a device can prove:
// the federation runtime's own transport, and that clearing it is enough. The load functions here
// stand where loadRemote stands, and the federation calls are spied on rather than run.
let warn: jest.SpyInstance;
beforeEach(() => {
  // Every case fails a load or a render on purpose. The boundary logs each failure, and React logs
  // every error a boundary catches on its own account.
  warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  jest.restoreAllMocks();
});

async function mount(element: React.ReactElement) {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    tree = ReactTestRenderer.create(element);
  });
  return tree;
}

test('a load that fails with no copy to try shows the error state, and Try again loads afresh', async () => {
  jest.spyOn(federation, 'canFallBack').mockReturnValue(false);
  const reload = jest.spyOn(federation, 'forceReloadRemote').mockImplementation(() => {});
  let attempts = 0;
  const load = () => {
    attempts += 1;
    if (attempts === 1) {
      return Promise.reject(new Error('container unreachable'));
    }
    return Promise.resolve({ default: () => <></> });
  };

  const tree = await mount(<RemoteBoundary remote="listApp" load={load} />);
  expect(texts(tree)).toContain('This tab could not load');

  await act(async () => {
    retryButton(tree).props.onPress();
  });
  // The runtime's record of the failed load was cleared before the second attempt, and the second
  // attempt was a fresh load: the cached rejection was discarded and the tab recovered.
  expect(reload).toHaveBeenCalledWith('listApp');
  expect(attempts).toBe(2);
  expect(texts(tree)).not.toContain('This tab could not load');

  await act(async () => {
    tree.unmount();
  });
});

test('a CDN load that fails drops the remote to its copy without showing the error state', async () => {
  let droppedToCopy = false;
  jest.spyOn(federation, 'canFallBack').mockImplementation(() => !droppedToCopy);
  const fallBack = jest.spyOn(federation, 'fallBackAndReload').mockImplementation(() => {
    droppedToCopy = true;
  });
  const load = () =>
    droppedToCopy
      ? Promise.resolve({ default: () => <></> })
      : Promise.reject(new Error('chunk did not verify'));

  const tree = await mount(<RemoteBoundary remote="listApp" load={load} />);
  expect(fallBack).toHaveBeenCalledTimes(1);
  expect(fallBack).toHaveBeenCalledWith('listApp');
  expect(texts(tree)).not.toContain('This tab could not load');
  expect(retryButton(tree)).toBeUndefined();

  await act(async () => {
    tree.unmount();
  });
});

// A remote that loaded and then threw has already run its code, and the boundary does not swap it
// for the copy mid-session: the error state comes straight away, even from the CDN with a copy on
// board.
test('a remote that loaded and then threw is shown as broken, and Try again renders it again', async () => {
  jest.spyOn(federation, 'canFallBack').mockReturnValue(true);
  const fallBack = jest.spyOn(federation, 'fallBackAndReload').mockImplementation(() => {});
  const reload = jest.spyOn(federation, 'forceReloadRemote').mockImplementation(() => {});
  // Broken until the test says otherwise. React retries a render that threw before it commits the
  // boundary's error state, so an error that stopped after one render would recover before the
  // boundary showed anything.
  let broken = true;
  const Flaky = () => {
    if (broken) {
      throw new Error('render failed');
    }
    return <></>;
  };

  const tree = await mount(
    <RemoteBoundary remote="listApp" load={() => Promise.resolve({ default: Flaky })} />,
  );
  expect(texts(tree)).toContain('This tab stopped working');
  expect(fallBack).not.toHaveBeenCalled();

  broken = false;
  await act(async () => {
    retryButton(tree).props.onPress();
  });
  // Nothing to clear for code that loaded: the runtime is left as it is and the tab renders again.
  expect(reload).not.toHaveBeenCalled();
  expect(texts(tree)).not.toContain('This tab stopped working');

  await act(async () => {
    tree.unmount();
  });
});

test('a remote that settles without a component fails as a load, under its own name', async () => {
  jest.spyOn(federation, 'canFallBack').mockReturnValue(false);
  const tree = await mount(<RemoteBoundary remote="listApp" load={() => Promise.resolve({})} />);
  expect(texts(tree)).toContain('This tab could not load');
  expect(warn).toHaveBeenCalledWith(
    'listApp failed',
    expect.objectContaining({ message: 'listApp loaded without a component to render' }),
  );
  await act(async () => {
    tree.unmount();
  });
});

// A React element carries $$typeof as well, and it is not a component: React cannot render it as a
// type. A remote whose export is one never produced a component, so it fails as a load and, with a
// copy on board, drops to the copy instead of being shown as a remote that broke while rendering.
test('a remote that exports an element rather than a component fails as a load and drops to its copy', async () => {
  let droppedToCopy = false;
  jest.spyOn(federation, 'canFallBack').mockImplementation(() => !droppedToCopy);
  const fallBack = jest.spyOn(federation, 'fallBackAndReload').mockImplementation(() => {
    droppedToCopy = true;
  });
  const load = () => Promise.resolve({ default: droppedToCopy ? () => <></> : <></> });

  const tree = await mount(<RemoteBoundary remote="listApp" load={load} />);
  expect(fallBack).toHaveBeenCalledWith('listApp');
  expect(warn).toHaveBeenCalledWith(
    'listApp failed',
    expect.objectContaining({ message: 'listApp loaded without a component to render' }),
  );
  expect(texts(tree)).not.toContain('This tab stopped working');

  await act(async () => {
    tree.unmount();
  });
});

// The object component types React makes, memo and forwardRef, still count as components.
test.each([
  ['memo', () => React.memo(() => <></>)],
  ['forwardRef', () => React.forwardRef(() => <></>)],
] as const)('a remote that exports a %s component renders', async (_, make) => {
  jest.spyOn(federation, 'canFallBack').mockReturnValue(false);
  const tree = await mount(
    <RemoteBoundary remote="listApp" load={() => Promise.resolve({ default: make() })} />,
  );
  expect(texts(tree)).not.toContain('This tab could not load');
  expect(texts(tree)).not.toContain('This tab stopped working');
  await act(async () => {
    tree.unmount();
  });
});

// The words under the title follow where this launch loads remotes from. A Release build served
// from the CDN has no dev server, so advice to check one would be wrong in exactly the build
// users run; the refused chunk and the missing version both land here.
test.each([
  ['dev', /dev server/],
  ['cdn', /downloaded, verified or started/],
  ['bundled', /own copy/],
  ['unresolved', /could not prepare/],
] as const)('in %s mode the error state says what to try there', async (mode, advice) => {
  jest.spyOn(federation, 'canFallBack').mockReturnValue(false);
  jest
    .spyOn(federation, 'getFederationStatus')
    .mockReturnValue({ mode, source: '', versions: {}, embedded: [] });
  const tree = await mount(
    <RemoteBoundary remote="listApp" load={() => Promise.reject(new Error('refused'))} />,
  );
  expect(texts(tree).some(t => advice.test(t))).toBe(true);
  if (mode !== 'dev') {
    expect(texts(tree).some(t => /dev server/.test(t))).toBe(false);
  }
  await act(async () => {
    tree.unmount();
  });
});
