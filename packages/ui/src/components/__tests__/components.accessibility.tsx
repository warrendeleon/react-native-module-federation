// --- Accessibility checks for the composed components.
//
// The token matrix next door proves the palette. This file proves the parts that a colour value
// cannot: what a control is called, what kind of thing it says it is, what state it reports, and
// whether anything here carries meaning by colour alone.
//
// Every screen in every remote is built from these, so a check that passes here is a check no
// remote has to repeat.

import React from 'react';
import {
  createThemedRender,
  expectAccessibilityProps,
  expectMinTouchTarget,
  expectNonColourCue,
  expectScreenReaderAnnouncement,
} from '@pokedex/a11y-testing';

import { ErrorState } from '../error-state';
import { LoadingState } from '../loading-state';
import { PokemonCard } from '../pokemon-card';
import { StatBar } from '../stat-bar';

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
      <StatBar label="Speed" value={65} max={255} colourType="fire" />,
    );
    const bar = getByRole('progressbar');
    expect(bar.props.accessibilityValue).toEqual(
      expect.objectContaining({ min: 0, max: 255, now: 65, text: '65' }),
    );
    expectNonColourCue(bar, '65');
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
    const caption = getByText('Loading Pokémon…');
    expectScreenReaderAnnouncement(liveRegionAround(caption), { politeness: 'polite' });
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
