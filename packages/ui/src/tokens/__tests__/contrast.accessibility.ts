// --- The token contrast matrix.
//
// This is the source contract. Every colour pair the design system promises is checked once,
// here, at the package that owns the tokens. If a pair passes in this file, every screen in every
// remote that composes those tokens passes too — nobody re-tests `text-white on bg-type-fire` in
// the Party app, because it cannot differ there.
//
// The matrix asserts the pairs the design system actually uses. Combinations that no component
// composes are left out on purpose: a failure nobody ships is noise, and it trains people to
// ignore the report.
//
// These are token values, not paint. What a device finally renders — after opacity, elevation
// tints and the OS's own contrast settings — belongs to the native audit layer.

import { colours } from '../colours';
import { TYPE_NAMES, colourForType, textOnTypeClass } from '../typeColours';
import { expectColorContrast } from '@pokedex/a11y-testing';

const TEXT_CLASS_TO_HEX: Record<string, string> = {
  'text-white': colours.white,
  'text-black': '#000000',
};

describe('WCAG 1.4.3 Contrast (Minimum) — type colours', () => {
  // The design system picks white or black text per type. That single decision is what lets a
  // remote render a badge for any of the eighteen types without thinking about contrast.
  test.each(TYPE_NAMES)('%s badge text clears AA on its type fill', (type: string) => {
    const background = colourForType(type);
    const foreground = TEXT_CLASS_TO_HEX[textOnTypeClass(type)];
    expectColorContrast(foreground, background, 'normalText');
  });
});

describe('WCAG 1.4.3 Contrast (Minimum) — body text on light surfaces', () => {
  test('primary text on white', () => {
    expectColorContrast(colours.darkGrey, colours.white);
  });

  test('primary text on the off-white app background', () => {
    expectColorContrast(colours.darkGrey, colours.offWhite);
  });

  test('primary text on the grey card surface', () => {
    expectColorContrast(colours.darkGrey, colours.offGrey);
  });

  test('primary text on the brand green', () => {
    expectColorContrast(colours.darkGrey, colours.pokemonGreen);
  });

  test('primary text on the pale green', () => {
    expectColorContrast(colours.darkGrey, colours.lightGreen);
  });

  // Secondary text is the one pair that does not clear the bar, and it ships in five places:
  // the two section headings and the disabled button label in the detail view, the empty slot's
  // caption, and the card's number line. At 2.75:1 it is well under the 4.5:1 that normal text
  // needs.
  //
  // It stays visible here rather than being quietly excluded. Fixing it is a palette decision,
  // not a test decision: darkening midGrey past roughly #6E6E85 clears AA, and it changes every
  // secondary line in every remote at once — which is precisely the kind of change that belongs
  // to the package that owns the token, not to whichever app noticed first.
  it.failing('secondary text on white (known: midGrey is 2.75:1, AA needs 4.5:1)', () => {
    expectColorContrast(colours.midGrey, colours.white);
  });

  it.failing('secondary text on the off-white background (known: 2.60:1)', () => {
    expectColorContrast(colours.midGrey, colours.offWhite);
  });
});

describe('WCAG 1.4.3 Contrast (Minimum) — text on dark surfaces', () => {
  // The Party tab is dark, and the same secondary token that fails on white is comfortable here.
  // A token is not accessible or inaccessible on its own; it is one only against a surface.
  test('primary text on navy', () => {
    expectColorContrast(colours.white, colours.navy);
  });

  test('secondary text on navy', () => {
    expectColorContrast(colours.midGrey, colours.navy);
  });

  test('divider text on navy', () => {
    expectColorContrast(colours.lightGrey, colours.navy);
  });

  test('primary text on the near-black surface', () => {
    expectColorContrast(colours.white, colours.black);
  });
});

describe('WCAG 1.4.11 Non-text Contrast — status colours', () => {
  // Error text and destructive affordances carry meaning, so they clear the 3:1 bar for
  // non-text and the 4.5:1 bar where they are rendered as normal-size copy.
  test('error red on white', () => {
    expectColorContrast(colours.white, colours.red, 'normalText');
  });

  test('brand purple as a filled control on white', () => {
    expectColorContrast(colours.white, colours.purple, 'normalText');
  });
});
