// --- Accessibility checks for the composed components.
//
// The token matrix next door proves the palette. This file proves the parts that a colour value
// cannot: what a control is called, what kind of thing it says it is, what state it reports, and
// whether anything here carries meaning by colour alone.
//
// Every screen in every remote is built from these, so a check that passes here is a check no
// remote has to repeat.

import { readFileSync } from 'node:fs';

import React from 'react';
import {
  createThemedRender,
  expectAccessibilityProps,
  expectMinTouchTarget,
  expectNonColourCue,
  expectScreenReaderAnnouncement,
} from '@pokedex/a11y-testing';

import { HERO_SCRIM_CLASS } from '../../tokens/typeColours';
import { ErrorState } from '../error-state';
import { LoadingState } from '../loading-state';
import { PokemonCard } from '../pokemon-card';
import { StatBar } from '../stat-bar';
import { TypeBadge } from '../type-badge';

const renderWithTheme = createThemedRender(require('../../../tailwind.preset.js'));

describe('WCAG 4.1.2 Name, Role, Value — PokemonCard', () => {
  test('a card is a labelled button naming the Pokémon, its number and its types', async () => {
    const { getByRole } = await renderWithTheme(
      <PokemonCard id={4} name="Charmander" types={['Fire']} spriteUri="sprite://4" onPress={() => {}} />,
    );
    expectAccessibilityProps(getByRole('button'), {
      role: 'button',
      label: 'Charmander, number 004, Fire type',
    });
  });

  test('a card without type data still names what it is', async () => {
    const { getByRole } = await renderWithTheme(
      <PokemonCard id={4} name="Charmander" types={[]} spriteUri="sprite://4" onPress={() => {}} />,
    );
    expectAccessibilityProps(getByRole('button'), { label: 'Charmander, number 004' });
  });
});

describe('WCAG 4.1.2 Name, Role, Value — a card that does nothing claims nothing', () => {
  // A decorative card is not a button. Announcing one would send a screen-reader user hunting
  // for an action that does not exist, so the role is conditional on there being a press handler.
  test('a card with no press handler exposes no button role', async () => {
    const { queryByRole } = await renderWithTheme(
      <PokemonCard id={4} name="Charmander" types={['Fire']} spriteUri="sprite://4" />,
    );
    expect(queryByRole('button')).toBeNull();
  });
});

describe('WCAG 4.1.2 Name, Role, Value — StatBar', () => {
  test('a stat bar reports itself as a progressbar carrying its value', async () => {
    const { getByRole } = await renderWithTheme(
      <StatBar label="Speed" value={65} max={255} colourType="fire" />,
    );
    expectAccessibilityProps(getByRole('progressbar'), {
      role: 'progressbar',
      label: 'Speed',
    });
  });
});

describe('WCAG 1.4.1 Use of Color — StatBar', () => {
  // The fill is type-coloured, which is decoration. The number has to be readable as a number,
  // because a bar length and a hue are not information a screen reader can convey.
  test('the magnitude is carried as text, not only as a coloured bar', async () => {
    const { getByRole } = await renderWithTheme(
      <StatBar label="Speed" value={65} colourType="fire" />,
    );
    const bar = getByRole('progressbar');
    // The shipped default, not a value this fixture supplied. An earlier version passed
    // max={255} and then asserted 255, so it compared a constant against itself: a component
    // that ignored the prop entirely survived it, while every stat row in the app announces
    // against 160.
    expect(bar.props.accessibilityValue).toEqual(
      expect.objectContaining({ min: 0, max: 160, now: 65, text: '65' }),
    );
    expectNonColourCue(bar, '65');
  });

  // And the override, so the prop is exercised as well as the default. A value above the
  // ceiling is clamped for `now` while the spoken text keeps the real number.
  //
  // The value has to sit above the ceiling for the clamp to run at all. An earlier version
  // passed value={200} max={255} under this exact title: the override was exercised, the clamp
  // never was, and a component that dropped Math.min entirely would have passed.
  test('an overridden ceiling is announced, and a value above it is clamped', async () => {
    const { getByRole } = await renderWithTheme(
      <StatBar label="Speed" value={200} max={120} colourType="fire" />,
    );
    expect(getByRole('progressbar').props.accessibilityValue).toEqual(
      expect.objectContaining({ min: 0, max: 120, now: 120, text: '200' }),
    );
  });
});

describe('WCAG 4.1.3 Status Messages — ErrorState', () => {
  // A failed load appears without moving focus, which is the whole of SC 4.1.3. Checking that
  // the retry is a button and the message is on screen is a 4.1.2 and a 1.4.1 check wearing a
  // 4.1.3 title, and it credited this criterion in the report for years' worth of runs without
  // ever reading a live region or an alert role.
  test('the error region announces itself assertively', async () => {
    const { getByRole } = await renderWithTheme(
      <ErrorState message="The network dropped." onRetry={() => {}} />,
    );
    expectScreenReaderAnnouncement(getByRole('alert'), { politeness: 'assertive' });
  });

  test('the announcement carries the message, not just the fact that something failed', async () => {
    const { getByRole, getByText } = await renderWithTheme(
      <ErrorState title="Something went wrong" message="The network dropped." onRetry={() => {}} />,
    );
    expect(getByRole('alert')).toBeTruthy();
    expect(getByText('Something went wrong')).toBeTruthy();
    expect(getByText('The network dropped.')).toBeTruthy();
  });
});

describe('WCAG 4.1.2 Name, Role, Value — ErrorState', () => {
  test('the retry affordance is a labelled button', async () => {
    const { getByRole, getByText } = await renderWithTheme(
      <ErrorState message="The network dropped." onRetry={() => {}} />,
    );
    // The label lives on the button's text child; a screen reader reads the composed content,
    // so the assertion follows the same path rather than demanding a label prop the design
    // system deliberately does not set.
    expect(getByRole('button')).toBeTruthy();
    expect(getByText('Retry')).toBeTruthy();
  });
});

describe('WCAG 2.5.5 Target Size — ErrorState', () => {
  test('the retry declares at least 44pt on both axes', async () => {
    const { getByRole } = await renderWithTheme(
      <ErrorState message="The network dropped." onRetry={() => {}} />,
    );
    expectMinTouchTarget(getByRole('button'));
  });
});

describe('WCAG 4.1.3 Status Messages — LoadingState', () => {
  // Polite, not assertive: a loading state should not cut across whatever the screen reader is
  // already saying. The spinner conveys nothing on its own, so the caption is the announcement.
  test('a loading state announces politely', async () => {
    const { getByText } = await renderWithTheme(<LoadingState caption="Loading Pokémon…" />);
    const region = liveRegionAround(getByText('Loading Pokémon…'));
    expectScreenReaderAnnouncement(region, { politeness: 'polite' });
    // A live region on a view nobody has marked accessible is inert: the platform has no single
    // element to announce. Checking the region without checking this passed a mutation that
    // removed the prop.
    expect(region.props?.accessible).toBe(true);
  });

  test('the caption says what is loading rather than leaving the spinner to say it', async () => {
    const { getByText } = await renderWithTheme(<LoadingState caption="Loading Pokémon…" />);
    expect(getByText('Loading Pokémon…')).toBeTruthy();
  });
});

/** The nearest ancestor that declares a live region: what a screen reader actually watches. */
function liveRegionAround(node: unknown) {
  let current = node as { parent: unknown; props?: Record<string, unknown> } | null;
  while (current) {
    if (current.props?.accessibilityLiveRegion || current.props?.accessibilityRole === 'alert') {
      return current;
    }
    current = current.parent as typeof current;
  }
  throw new Error('Nothing around that text declares a live region.');
}

describe('WCAG 1.4.3 Contrast (Minimum) — the badge takes its surface from the token module', () => {
  // The matrix composites every hero badge against HERO_SCRIM_ALPHA, and the check beside it
  // proves the constant and the class agree with each other. Both are exported from the same
  // module, so neither notices if the component stops using them: changing the class written in
  // type-badge.tsx to bg-white/5 left all ninety-three checks green while four types fell below
  // AA on the real surface.
  //
  // This reads the component's source rather than its paint, which needs saying. The badge picks
  // its surface class inside its own render, and nativewind/test only compiles the classes on the
  // tree handed to render, so nothing downstream of that choice reaches the rendered output — the
  // hero and card badges are byte-identical in this environment, style and all. Asserting on the
  // render would be the same green-for-nothing this file exists to catch. What can be checked is
  // that the decision still comes from the token module and not from a literal in the component.
  const source = readFileSync(require.resolve('../type-badge.tsx'), 'utf8');

  test('the hero surface comes from HERO_SCRIM_CLASS', () => {
    expect(source).toContain('HERO_SCRIM_CLASS');
    expect(source).toMatch(/surface === 'hero'\s*\?\s*HERO_SCRIM_CLASS/);
  });

  test('the badge writes no scrim literal of its own', () => {
    expect(source).not.toMatch(/bg-white\/\d+/);
  });
});
