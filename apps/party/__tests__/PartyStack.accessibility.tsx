// --- The Party remote checked against the same bar.
//
// Same preset, same helpers, different screens. What this team owns is a grid of six slots that
// are either a member or a gap, and a per-slot removal that is deliberately not a separate
// button in the accessibility tree.

import React from 'react';
import { EmptySlot, PokemonCard } from '@pokedex/ui';
import { createThemedRender, expectAccessibilityProps } from '@pokedex/a11y-testing';

const renderWithTheme = createThemedRender(require('@pokedex/ui/tailwind.preset.js'));

const member = {
  id: 25,
  name: 'Pikachu',
  types: ['Electric'],
  spriteUri: 'sprite://25',
};

describe('WCAG 4.1.2 Name, Role, Value — a filled party slot', () => {
  test('a member slot is a button that names its Pokémon', async () => {
    const { getByRole } = await renderWithTheme(
      <PokemonCard
        id={member.id}
        name={member.name}
        types={member.types}
        spriteUri={member.spriteUri}
        onPress={() => {}}
        onRemove={() => {}}
      />,
    );
    expectAccessibilityProps(getByRole('button'), {
      role: 'button',
      label: 'Pikachu, number 025, Electric type',
    });
  });

  // The ✕ badge is small, and making it a second focus stop next to the card it sits on would
  // double the number of things to swipe past. The design system hides it from the tree and
  // exposes removal as an action on the card instead, which is how a screen-reader user reaches
  // it: rotor, "Remove from party", double tap. The check is that the action exists at all —
  // a hidden control with no action behind it would be unreachable.
  test('removal is reachable as an action on the slot, not as a hidden button', async () => {
    const { getByRole } = await renderWithTheme(
      <PokemonCard
        id={member.id}
        name={member.name}
        types={member.types}
        spriteUri={member.spriteUri}
        onPress={() => {}}
        onRemove={() => {}}
      />,
    );
    expect(getByRole('button').props.accessibilityActions).toEqual([
      { name: 'remove', label: 'Remove from party' },
    ]);
  });

  test('a slot with no removal wired exposes no removal action', async () => {
    const { getByRole } = await renderWithTheme(
      <PokemonCard
        id={member.id}
        name={member.name}
        types={member.types}
        spriteUri={member.spriteUri}
        onPress={() => {}}
      />,
    );
    expect(getByRole('button').props.accessibilityActions).toBeUndefined();
  });
});

describe('WCAG 1.1.1 Non-text Content — an empty party slot', () => {
  // An empty slot is a gap, not a control. It still says which gap it is, so someone moving
  // through the grid knows where they are rather than hearing six identical silences.
  test('an empty slot says which slot it is', async () => {
    const { getByLabelText } = await renderWithTheme(<EmptySlot number={3} />);
    expect(getByLabelText('Empty party slot 3')).toBeTruthy();
  });

  test('an empty slot is not announced as a button', async () => {
    const { queryByRole } = await renderWithTheme(<EmptySlot number={3} />);
    expect(queryByRole('button')).toBeNull();
  });
});
