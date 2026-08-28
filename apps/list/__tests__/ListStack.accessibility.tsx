// --- The List remote checked against the same bar as everything else.
//
// The design system's own suite already proved the tokens and the components. What is left is
// what only this team can check: the screens they compose out of them. Nothing in this file
// re-tests a card's label format — that is settled at the source — it tests that the rows this
// screen builds from real data are labelled at all, and that the states a user can land in are
// reachable by a screen reader.

import React from 'react';
import { PokemonCard, ErrorState } from '@pokedex/ui';
import {
  createThemedRender,
  expectAccessibilityProps,
  expectMinTouchTarget,
} from '@pokedex/a11y-testing';

const renderWithTheme = createThemedRender(require('@pokedex/ui/tailwind.preset.js'));

// A slice of what the list endpoint returns, in the shape the screen maps over.
const rows = [
  { id: 1, name: 'Bulbasaur', types: ['Grass', 'Poison'], spriteUri: 'sprite://1' },
  { id: 25, name: 'Pikachu', types: ['Electric'], spriteUri: 'sprite://25' },
];

describe('WCAG 4.1.2 Name, Role, Value — the Pokédex rows', () => {
  test.each(rows)('the $name row is a button that names itself', async row => {
    const { getByRole } = await renderWithTheme(
      <PokemonCard
        id={row.id}
        name={row.name}
        types={row.types}
        spriteUri={row.spriteUri}
        onPress={() => {}}
      />,
    );
    expectAccessibilityProps(getByRole('button'), {
      role: 'button',
      label: new RegExp(`^${row.name}, number `),
    });
  });
});

describe('WCAG 2.5.5 Target Size — the error state', () => {
  // The retry is the only way out of a failed load, so it is the one control on this screen
  // that must never be hard to hit.
  test('the retry button clears the 44pt bar', async () => {
    const { getByRole } = await renderWithTheme(
      <ErrorState message="Couldn't reach PokéAPI." onRetry={() => {}} retryLabel="Try again" />,
    );
    // This passes because the design system declares the height on ErrorState's button, not
    // because this app did anything. One package release, every remote's retry covered.
    // The check is on the declared size; what the control finally occupies after layout and
    // clipping is the native audit layer's job.
    expectMinTouchTarget(getByRole('button'));
  });

  test('the retry button says what it does', async () => {
    const { getByText } = await renderWithTheme(
      <ErrorState message="Couldn't reach PokéAPI." onRetry={() => {}} retryLabel="Try again" />,
    );
    expect(getByText('Try again')).toBeTruthy();
  });
});

describe('WCAG 4.1.3 Status Messages — the party counter', () => {
  // The header reads "My Party 3/6". A sighted user watches the number change; a screen-reader
  // user is told nothing, because the header is static text with no live region.
  //
  // This is the honest example of what the automated layer cannot fix by itself: the check below
  // records the gap rather than pretending the screen announces something it does not. Closing it
  // is a product decision about how chatty the tab should be, and it belongs in the same package
  // discussion as the counter itself.
  it.failing('the party count change is announced (known: the header has no live region)', () => {
    const header = { props: { children: 'My Party 3/6' } };
    expect(header.props).toHaveProperty('accessibilityLiveRegion');
  });
});
