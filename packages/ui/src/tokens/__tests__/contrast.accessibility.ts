// --- The token contrast matrix.
//
// This is the source contract for the pairs it covers. Every foreground/background pair the
// design system composes is checked once, here, in the package that owns the tokens. If a pair
// passes in this file, every screen in every remote that composes that pair passes too, and
// nobody re-checks a type badge in the Party app.
//
// Two rules keep the file honest, both learned the hard way.
//
// 1. Foregrounds are resolved from the Tailwind preset, never written as literals. An earlier
//    version of this file mapped 'text-black' to '#000000'. The preset defines a `black` neutral
//    of #2E3138 that shadows Tailwind's default, so the class painted #2E3138 while the matrix
//    measured pure black. Water fell to 3.74:1 and psychic to 3.81:1 and this file stayed green.
//    Reading the preset means a token change cannot outrun the test again.
//
// 2. A pair is checked on the surface it is actually drawn on. The hero badge sits on a
//    translucent scrim rather than the fill, so it is composited here the same way the runtime
//    composites it.
//
// The matrix covers the pairs the design system composes. A combination no component builds is
// left out on purpose: a failure nobody ships is noise, and it trains people to ignore the
// report. Where that leaves a real pair unchecked, the pair is added rather than the rule bent.
//
// These are token values, not paint. What a device finally renders, after elevation tints and
// the OS's own contrast settings, belongs to the native audit layer.

import { colours } from '../colours';
import {
  HERO_SCRIM_ALPHA,
  TYPE_NAMES,
  colourForType,
  textOnHeroScrimClass,
  textOnTypeClass,
} from '../typeColours';
import { expectColorContrast } from '@pokedex/a11y-testing';

const preset = require('../../../tailwind.preset.js');
const presetColours: Record<string, string> = preset.theme.extend.colors;

/** Resolves a foreground class to the hex the preset gives it. Throws on an unknown token. */
function hexForTextClass(className: string): string {
  const token = className.replace(/^text-/, '');
  const hex = presetColours[token];
  if (typeof hex !== 'string') {
    throw new Error(
      `No preset colour for "${className}". The matrix resolves foregrounds from ` +
        'tailwind.preset.js so a renamed or shadowed token fails the suite instead of passing it.',
    );
  }
  return hex;
}

/** Composites `overlay` at `alpha` onto `base`, the way a translucent scrim paints at runtime. */
function composite(overlay: string, alpha: number, base: string): string {
  const channel = (hex: string, index: number) => parseInt(hex.replace('#', '').substr(index * 2, 2), 16);
  const mix = (index: number) =>
    Math.round(alpha * channel(overlay, index) + (1 - alpha) * channel(base, index));
  return `#${[0, 1, 2].map(i => mix(i).toString(16).padStart(2, '0')).join('')}`;
}

describe('WCAG 1.4.3 Contrast (Minimum) — type colours on the solid fill', () => {
  // The design system picks the foreground per type. That single decision is what lets a remote
  // render a badge for any of the eighteen types without thinking about contrast.
  test.each(TYPE_NAMES)('%s badge text clears AA on its type fill', (type: string) => {
    expectColorContrast(hexForTextClass(textOnTypeClass(type)), colourForType(type), 'normalText');
  });
});

describe('WCAG 1.4.3 Contrast (Minimum) — type colours under the hero scrim', () => {
  // TypeBadge's hero variant paints a 30% white scrim over the hero, so the text sits on a
  // lighter surface than the fill. Checking the fill alone passed rock, ghost, dragon and steel
  // at 3.17, 3.14, 3.39 and 2.71 on the surface they are actually drawn on.
  test.each(TYPE_NAMES)('%s badge text clears AA on the hero scrim', (type: string) => {
    const scrim = composite(colours.white, HERO_SCRIM_ALPHA, colourForType(type));
    expectColorContrast(hexForTextClass(textOnHeroScrimClass(type)), scrim, 'normalText');
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

  // Secondary text is the token that does not clear the bar, and it ships in five places: the
  // two section headings and the disabled button label in the detail view, the empty slot's
  // caption, and the card's number line. Those five sit on four different surfaces, so the
  // failure is recorded once per surface rather than once per token.
  //
  // It stays visible here rather than being quietly excluded. Fixing it is a palette decision,
  // not a test decision: darkening midGrey past roughly #6E6E85 clears AA on all four, and it
  // changes every secondary line in every remote at once, which is precisely the kind of change
  // that belongs to the package that owns the token rather than to whichever app noticed first.
  it.failing('secondary text on white (known: midGrey is 2.75:1, AA needs 4.5:1)', () => {
    expectColorContrast(colours.midGrey, colours.white);
  });

  it.failing('secondary text on the off-white background (known: 2.60:1)', () => {
    expectColorContrast(colours.midGrey, colours.offWhite);
  });

  it.failing("secondary text on the card's grey pill (known: 2.46:1)", () => {
    expectColorContrast(colours.midGrey, colours.offGrey);
  });

  it.failing('disabled button label on the disabled fill (known: 2.02:1)', () => {
    expectColorContrast(colours.midGrey, colours.lightGrey);
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
