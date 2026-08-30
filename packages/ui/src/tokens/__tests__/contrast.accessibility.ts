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
  HERO_SCRIM_CLASS,
  TYPE_NAMES,
  bgClassForType,
  colourForType,
  textOnHeroScrimClass,
  textOnTypeClass,
} from '../typeColours';
import { expectColorContrast, knownFinding } from '@pokedex/a11y-testing';

const preset = require('../../../tailwind.preset.js');
// The preset's colour scale is flat tokens plus one nested `type` scale, so it is typed as the
// union rather than cast at each lookup.
const presetColours: Record<string, string | Record<string, string>> = preset.theme.extend.colors;

/** Resolves a class to the hex the preset gives it. Throws on an unknown token. */
function hexForClass(className: string): string {
  const token = className.replace(/^(text|bg)-/, '');
  const scale = presetColours.type as Record<string, string>;
  const hex = token.startsWith('type-') ? scale[token.slice('type-'.length)] : presetColours[token];
  if (typeof hex !== 'string') {
    throw new Error(
      `No preset colour for "${className}". The matrix resolves both sides of every pair from ` +
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
    expectColorContrast(
      hexForClass(textOnTypeClass(type)),
      hexForClass(bgClassForType(type)),
      'normalText',
    );
  });
});

describe('WCAG 1.4.3 Contrast (Minimum) — the preset and the token modules agree', () => {
  // Both halves of every pair are resolved from the preset above, because the preset is what
  // paints. The token modules exist for runtime code that needs a hex directly, and their own
  // comments say to keep the two in sync. This is what makes that a check rather than a wish:
  // without it, a colour changed in one file and not the other is invisible to every pair here.
  test.each(TYPE_NAMES)('%s resolves to the same hex in both', (type: string) => {
    expect(hexForClass(bgClassForType(type))).toBe(colourForType(type));
  });

  test('every named colour token matches the preset', () => {
    for (const [name, hex] of Object.entries(colours)) {
      expect({ [name]: presetColours[name] }).toEqual({ [name]: hex });
    }
  });
});

describe('WCAG 1.4.3 Contrast (Minimum) — type colours under the hero scrim', () => {
  // TypeBadge's hero variant paints a 30% white scrim over the hero, so the text sits on a
  // lighter surface than the fill. Checking the fill alone passed rock, ghost, dragon and steel
  // at 3.17, 3.14, 3.39 and 2.71 on the surface they are actually drawn on.
  test.each(TYPE_NAMES)('%s badge text clears AA on the hero scrim', (type: string) => {
    const scrim = composite(hexForClass('bg-white'), HERO_SCRIM_ALPHA, hexForClass(bgClassForType(type)));
    expectColorContrast(hexForClass(textOnHeroScrimClass(type)), scrim, 'normalText');
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

  // Secondary text is the token that does not clear the bar. It ships in four places on three
  // surfaces: two section headings on the detail sheet, the card's number line inside its grey
  // pill, and the disabled Add button's label. The off-white and off-grey pairs are ordinary
  // failures. The disabled label is not: WCAG 1.4.3's Incidental exception says text "that is
  // part of an inactive user interface component ... has no contrast requirement", so holding it
  // to 4.5:1 is this project's own choice and is filed below rather than here, where it would
  // read as a criterion failure it is not.
  //
  // These are the light surfaces. The same token composes two more in dark mode, measured in
  // their own describe below; both were missing from this file until the seventh audit found
  // them, and both fail.
  //
  // Fixing the token is a palette decision, not a test decision, and there is no single darker
  // value that does it. Past roughly #5F5F6D the token clears AA on the three light surfaces
  // (5.92:1, 5.60:1, 4.60:1), but the detail sheet is dark:bg-navy and those headings carry no
  // dark override, so the navy pair below — comfortable at 6.48:1 today — drops to 2.84:1. The
  // 70% caption would still sit at 3.09:1. It needs a second token for the dark surface and a
  // different treatment for the caption, which changes every secondary line in every remote at
  // once: the kind of change that belongs to the package that owns the token rather than to
  // whichever app noticed first.
  knownFinding('secondary text on the detail sheet', 'midGrey is 2.60:1, AA needs 4.5:1', () => {
    expectColorContrast(colours.midGrey, colours.offWhite);
  });

  knownFinding("secondary text on the card's grey pill", '2.46:1', () => {
    expectColorContrast(colours.midGrey, colours.offGrey);
  });

  // The empty slot's caption is text-midGrey/70, a different value from the token: composited
  // over the app background it is 1.88:1. A pair the design system composes and the matrix was
  // not measuring, which is the fault this file exists to prevent.
  knownFinding("the empty slot's caption at 70%", '1.88:1', () => {
    expectColorContrast(composite(colours.midGrey, 0.7, colours.offWhite), colours.offWhite);
  });
});

describe('WCAG 1.4.3 Contrast (Minimum) — the same secondary token in dark mode', () => {
  // Both remotes mount ThemeToggle in their header, so every surface here is one a user reaches.
  // Neither of these carried a `dark:` override, and the enumeration above counted light
  // surfaces only, so the design system composed two pairs the matrix had never measured — the
  // exact rule this file opens with, applied to its own blind spot rather than to a component's.
  knownFinding("the card's number line on the dark pill", '3.44:1', () => {
    expectColorContrast(colours.midGrey, composite(colours.white, 0.1, colours.black));
  });

  knownFinding("the empty slot's caption at 70% on navy", '3.82:1', () => {
    expectColorContrast(composite(colours.midGrey, 0.7, colours.navy), colours.navy);
  });
});

describe('Project bar — pairs held above what the criteria require', () => {
  // Not a 1.4.3 failure. The label sits inside a disabled control, which the Incidental
  // exception exempts outright. It is tracked because this project would rather a disabled
  // control still be readable, and an exempt pair recorded as a criterion failure is the same
  // mis-citation the touch-target bar is careful to avoid.
  knownFinding('disabled button label on its fill', '2.02:1, exempt under 1.4.3 Incidental', () => {
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

describe('WCAG 1.4.3 Contrast (Minimum) — the scrim class and its alpha agree', () => {
  // The component paints a class; the contrast map is computed from a number. Nothing else ties
  // them together, so a badge changed to bg-white/5 would leave every check here green while the
  // real surface moved four types below AA.
  test('the class TypeBadge paints encodes the alpha the map was computed against', () => {
    expect(HERO_SCRIM_CLASS).toBe(`bg-white/${Math.round(HERO_SCRIM_ALPHA * 100)}`);
  });
});
