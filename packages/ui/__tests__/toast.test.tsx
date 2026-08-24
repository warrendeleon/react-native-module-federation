/**
 * @format
 */

import React from 'react';
import { AccessibilityInfo } from 'react-native';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { toast, Toaster } from '../src/components/toast';

test('before a Toaster mounts, the announcement still fires and nothing crashes', () => {
  const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});
  expect(() => toast('Pikachu joined your party')).not.toThrow();
  expect(announce).toHaveBeenCalledWith('Pikachu joined your party');
  announce.mockRestore();
});

test('with a Toaster mounted, the message renders', async () => {
  jest.useFakeTimers();
  const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});
  let tree!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    tree = ReactTestRenderer.create(<Toaster />);
  });
  await act(async () => {
    toast('Pikachu joined your party');
  });
  const texts = tree.root
    .findAll(n => typeof n.props.children === 'string')
    .map(n => n.props.children);
  expect(texts).toContain('Pikachu joined your party');
  await act(async () => tree.unmount());
  await act(async () => {
    jest.runOnlyPendingTimers();
  });
  announce.mockRestore();
});
