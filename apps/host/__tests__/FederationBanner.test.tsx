/**
 * @format
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { colours } from '@pokedex/ui';
import { FederationBanner } from '../src/shell/FederationBanner';
import * as federation from '../src/shell/scriptManager';
import type { FederationStatus } from '../src/shell/scriptManager';

// The banner is the demo's evidence: every screenshot in the fallback post is read off this line.
// So what it says for each state is pinned here, and so is the one behaviour a launch-time read
// would miss, a remote dropping to its copy after the banner has already rendered.

const METRICS = {
  frame: { x: 0, y: 0, width: 402, height: 874 },
  insets: { top: 62, left: 0, right: 0, bottom: 34 },
};

let current: FederationStatus;
let notify: () => void = () => {};

beforeEach(() => {
  jest.spyOn(federation, 'getFederationStatus').mockImplementation(() => current);
  jest.spyOn(federation, 'subscribeFederationStatus').mockImplementation(listener => {
    notify = listener;
    return () => {
      notify = () => {};
    };
  });
});
afterEach(() => {
  jest.restoreAllMocks();
});

async function mount() {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    tree = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={METRICS}>
        <FederationBanner />
      </SafeAreaProvider>,
    );
  });
  return tree;
}

const line = (tree: ReactTestRenderer.ReactTestRenderer) =>
  tree.root
    .findAll(n => (n.type as unknown) === 'Text')
    .map(n => ([] as unknown[]).concat(n.props.children).join(''))
    .join('');

const fill = (tree: ReactTestRenderer.ReactTestRenderer) =>
  tree.root
    .findAll(n => (n.type as unknown) === 'View')
    .map(n => ([] as unknown[]).concat(n.props.style).find(style => style && typeof style === 'object' && 'backgroundColor' in (style as object)))
    .filter(Boolean)
    .map(style => (style as { backgroundColor: string }).backgroundColor)[0];

test('bundled mode says so in its own colour, with the versions the binary carries', async () => {
  current = {
    mode: 'bundled',
    source: 'the copy in the binary',
    versions: { listApp: '1.1.0', partyApp: '1.0.0' },
    embedded: ['listApp', 'partyApp'],
  };
  const tree = await mount();
  expect(line(tree)).toBe('bundled · listApp 1.1.0 · partyApp 1.0.0');
  expect(fill(tree)).toBe(colours.purple);
});

test('a remote that drops to its copy mid-session is marked the moment it does', async () => {
  current = {
    mode: 'cdn',
    source: 'https://cdn.example.com',
    versions: { listApp: '1.2.0', partyApp: '1.0.0' },
    embedded: [],
  };
  const tree = await mount();
  expect(line(tree)).toBe('cdn · listApp 1.2.0 · partyApp 1.0.0');

  current = { ...current, versions: { ...current.versions, listApp: '1.1.0' }, embedded: ['listApp'] };
  await act(async () => {
    notify();
  });
  expect(line(tree)).toBe('cdn · listApp 1.1.0 embedded · partyApp 1.0.0');
  expect(fill(tree)).toBe(colours.blueText);
  // Spoken without the middle dots, which a screen reader reads as a word, a pause or nothing.
  expect(
    tree.root.findAll(n => n.props.accessibilityLabel !== undefined)[0].props.accessibilityLabel,
  ).toBe('Federation mode cdn. listApp 1.1.0 embedded, partyApp 1.0.0');
});
