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
import { EmptySlot } from '../empty-slot';
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

  // Same shape for the floating back pill, whose dark scrim is the other translucent surface the
  // matrix composites. It painted bg-black/35 — the near-black neutral, not real black — which put
  // the white chevron under 3:1 on three of the eighteen heroes.
  const pillSource = readFileSync(require.resolve('../back-pill.tsx'), 'utf8');

  test('the back pill takes its dark scrim from BACK_PILL_SCRIM_CLASS', () => {
    expect(pillSource).toContain('BACK_PILL_SCRIM_CLASS');
    expect(pillSource).toMatch(/\$\{BACK_PILL_SCRIM_CLASS\}/);
  });

  test('the back pill writes no scrim literal of its own', () => {
    expect(pillSource).not.toMatch(/bg-(black|white|typeInk)\/\d+/);
  });
});

describe('WCAG 1.4.3 Contrast (Minimum) — the components compose the secondary pair', () => {
  // A matrix measures pairs; only the component can be asked whether it composes them. The
  // twelfth round repaired secondary text to `text-darkGrey dark:text-lightGrey` and the token
  // matrix went green — and stayed green when the card was reverted to `text-midGrey`, because a
  // matrix never sees a class. A render assertion cannot close it either: `nativewind/test`
  // compiles only the tree handed to `render`, so a class a component picks inside its own render
  // never compiles, which is how an earlier round's scrim assertion came out vacuous. So the
  // class is read from source, the way the host's tab tints are.
  //
  // This sits under 1.4.3 and not beside the target-size guards it was first written next to:
  // filing a contrast check as a target-size one is the mis-citation this suite is careful about,
  // and it inflated the 2.5.5 count from four checks to six before it was moved.
  const secondaryClass = (file: string, what: string) => {
    const src = readFileSync(require.resolve(`../${file}`), 'utf8');
    const found = /className="[^"]*\btext-(\w+)(?:\/\d+)?\s+dark:text-(\w+)(?:\/\d+)?[^"]*"/.exec(src);
    if (!found) {
      throw new Error(`could not read ${what} — no themed secondary class in ${file}`);
    }
    return { light: found[1], dark: found[2] };
  };

  test.each([
    ['pokemon-card.tsx', "the card's number line"],
    ['empty-slot.tsx', "the empty slot's caption"],
  ])('%s composes the secondary pair the matrix cleared', (file, what) => {
    expect(secondaryClass(file, what)).toEqual({ light: 'darkGrey', dark: 'lightGrey' });
  });
});

describe('WCAG 4.1.2 Name, Role, Value — the props only the apps were guarding', () => {
  // These four props live in @pokedex/ui but were asserted only in apps/party, which resolves
  // this package from the registry rather than the workspace. A regression in src was therefore
  // invisible to every suite in the repo until someone republished.
  test("the card's remove badge stays out of the accessibility tree", async () => {
    const { getByRole } = await renderWithTheme(
      <PokemonCard id={4} name="Charmander" types={['Fire']} spriteUri="sprite://4" onPress={() => {}} onRemove={() => {}} />,
    );
    const card = getByRole('button');
    expect(card.props.accessibilityActions).toEqual([{ name: 'remove', label: 'Remove from party' }]);
    const source = readFileSync(require.resolve('../pokemon-card.tsx'), 'utf8');
    expect(source).toMatch(/accessible=\{false\}/);
    expect(source).toMatch(/accessibilityElementsHidden/);
    expect(source).toMatch(/importantForAccessibility="no-hide-descendants"/);
  });

  test('an empty slot is one named element, not a silent box', async () => {
    const { getByLabelText } = await renderWithTheme(<EmptySlot number={3} />);
    const slot = getByLabelText('Empty party slot 3');
    expect(slot.props.accessible).toBe(true);
  });
});

describe('WCAG 2.5.5 Target Size — the controls that size themselves from a class', () => {
  // Three controls take their painted size from source and extend it with hitSlop.
  // expectMinTouchTarget cannot verify them here for the reason this file keeps running into: a
  // class chosen inside a component never compiles in the test tree, so the helper reads a width
  // of nothing. What can be checked is the declared size against the declared hitSlop, with
  // NativeWind's rem of 14 written out rather than assumed.
  //
  // Every read below throws when it misses. The first version of this block used `?? 22` for the
  // theme toggle, and both of its patterns missed the real source, so it measured a literal
  // written in the test: changing the component's default to 10 left it green. A guard that
  // falls back to a constant is a guard that cannot fail.
  const REM = 14;
  const sized = (file: string) => readFileSync(require.resolve(`../${file}`), 'utf8');

  const readOne = (src: string, pattern: RegExp, what: string): number => {
    const found = pattern.exec(src);
    if (!found) {
      throw new Error(`could not read ${what} — the pattern no longer matches the component`);
    }
    return Number(found[1]);
  };

  const readAll = (src: string, pattern: RegExp, what: string): number[] => {
    const found = [...src.matchAll(pattern)].map(m => Number(m[1]));
    if (!found.length) {
      throw new Error(`could not read ${what} — the pattern no longer matches the component`);
    }
    return found;
  };

  const slopOf = (src: string) => readOne(src, /hitSlop=\{(\d+)\}/, 'hitSlop');

  test("the card's remove badge reaches 44 with its hitSlop", () => {
    const src = sized('pokemon-card.tsx');
    const painted = (readOne(src, /\bh-(\d+) w-\d+ items-center justify-center rounded-full bg-red/, "the badge's size class") / 4) * REM;
    expect(painted + slopOf(src) * 2).toBeGreaterThanOrEqual(44);
  });

  test('the back pill reaches 44 with its hitSlop, in both schemes', () => {
    const src = sized('back-pill.tsx');
    // Both branches, not the first match: the light branch was shrinkable to h-4 with this
    // check green, because a single exec reads only the dark one written above it.
    const painted = readAll(src, /\bh-(\d+) w-\d+ items-center justify-center rounded-full border/g, "the pill's size classes");
    expect(painted).toHaveLength(2);
    for (const units of painted) {
      expect((units / 4) * REM + slopOf(src) * 2).toBeGreaterThanOrEqual(44);
    }
  });

  test('the theme toggle reaches 44 around its glyph', () => {
    const src = sized('theme-toggle.tsx');
    // The glyph is sized by a prop with a default, and the Image reads that prop, so both halves
    // are checked: the default is the number that ships, and the style has to be using it.
    const painted = readOne(src, /function ThemeToggle\(\{[^}]*size = (\d+)/, "the toggle's default glyph size");
    expect(src).toMatch(/style=\{\{ width: size, height: size/);
    expect(painted + slopOf(src) * 2).toBeGreaterThanOrEqual(44);
  });
});
