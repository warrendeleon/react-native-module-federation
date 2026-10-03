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
  BACK_PILL_SCRIM_ALPHA,
  BACK_PILL_SCRIM_CLASS,
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
  // Both halves of every pair are resolved from the Tailwind preset, because the preset is what
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

  // The party counter's pill, in both remotes' headers. It painted text-darkGreen until the
  // eighth audit: darkGreen is #A6D3A0, the same value as the grass fill, and on lightGreen it
  // measured 1.53:1 at xs. The pair 'primary text on the pale green' was in this file all along
  // and passing; the pill was simply composing a different one nobody had measured. It now uses
  // that pair, and the counter has no colour of its own left to get wrong.
  test('the party counter on its pale green pill', () => {
    expectColorContrast(colours.darkGrey, colours.lightGreen);
  });

  // Secondary text used to be the token that did not clear the bar. It painted `text-midGrey` in
  // four places on three light surfaces and, once the seventh audit looked, on two dark ones too,
  // and all five were parked on the reasoning that no single darker value fixes them. That was
  // true and it was the wrong question: nothing here needs a single value. This design system is
  // theme-aware and already carried `dark:text-lightGrey` in eight other places, so secondary
  // text now takes `text-darkGrey dark:text-lightGrey` at every site and the empty slot's caption
  // paints the token at full strength instead of at 70%. Worst pair of the six is 6.94:1.
  //
  // What stays behind is the disabled Add label, which is exempt rather than parked: 1.4.3's
  // Incidental clause says text "that is part of an inactive user interface component ... has no
  // contrast requirement". It is filed in the 'Project bar' block, so a threshold this project
  // chooses is never counted as a result against a criterion.
  test('secondary text on the detail sheet', () => {
    expectColorContrast(colours.darkGrey, colours.offWhite);
  });

  test("secondary text on the card's grey pill", () => {
    expectColorContrast(colours.darkGrey, colours.offGrey);
  });

  // The empty slot's caption is text-midGrey/70, a different value from the token: composited
  // over the app background it is 1.88:1. A pair the design system composes and the matrix was
  // not measuring, which is the fault this file exists to prevent.
  test("the empty slot's caption", () => {
    expectColorContrast(colours.darkGrey, colours.offWhite);
  });
});

describe('WCAG 1.4.3 Contrast (Minimum) — the same secondary token in dark mode', () => {
  // Both remotes mount ThemeToggle in their header, so every surface here is one a user reaches.
  // Neither of these carried a `dark:` override, and the enumeration in 'body text on light
  // surfaces' counted light surfaces only, so the design system composed two pairs the matrix had
  // never measured — the exact rule this file opens with, applied to its own blind spot rather
  // than to a component's.
  test("the card's number line on the dark pill", () => {
    expectColorContrast(colours.lightGrey, composite(colours.white, 0.1, colours.black));
  });

  test("the empty slot's caption on navy", () => {
    expectColorContrast(colours.lightGrey, colours.navy);
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

  // Secondary text on navy is `lightGrey` since the twelfth round; `midGrey` paints no text on
  // any dark surface now, so measuring it here would be the inverse of this file's own rule — a
  // pair nothing composes.
  test('secondary text on navy', () => {
    expectColorContrast(colours.lightGrey, colours.navy);
  });

  test('divider text on navy', () => {
    expectColorContrast(colours.lightGrey, colours.navy);
  });

  test('primary text on the near-black surface', () => {
    expectColorContrast(colours.white, colours.black);
  });

  // The dark half of the party counter's pill: the pill drops to bg-white/10 over navy and the
  // numeral to the brand green. This half was always comfortable, which is exactly why it was
  // never measured — the light half beside it was at 1.53:1 for the same reason.
  test('the party counter on its dark pill', () => {
    expectColorContrast(colours.pokemonGreen, composite(colours.white, 0.1, colours.navy));
  });

  // The same pill at six, where it deepens to mark the full party. In light that is a change of
  // hue; over navy the pill is translucent white to begin with, so it is a change of alpha, and
  // the brighter surface it leaves is the one the numeral now sits on.
  test('the party counter on its dark pill at six', () => {
    expectColorContrast(colours.pokemonGreen, composite(colours.white, 0.2, colours.navy));
  });
});

describe('WCAG 1.4.11 Non-text Contrast — the floating back pill', () => {
  // The chevron is the only thing identifying this control, and the pill is the only way off the
  // detail screen, so its glyph is held to the 3:1 SC 1.4.11 asks of a control's own boundary.
  // The dark variant floats a translucent scrim over whichever hero it lands on, so every fill is
  // a surface it composes — the pair was measured nowhere until the tenth reading of this file.
  // Both the token and the alpha are read out of the one class the pill paints, so there is a
  // single source of truth. Writing `bg-typeInk` here as a second literal would have been the
  // same two-constants fault the hero scrim's guard exists to catch: reverting the component to
  // bg-black/35 would have left these eighteen measuring a colour the pill no longer paints.
  const [, scrimToken, scrimPercent] = /^bg-([A-Za-z]+)\/(\d+)$/.exec(BACK_PILL_SCRIM_CLASS) ?? [];
  const scrimInk = hexForClass(`bg-${scrimToken}`);
  const scrimAlpha = Number(scrimPercent) / 100;

  test('the class the pill paints is the one the map composites', () => {
    expect(scrimInk).toBeDefined();
    expect(scrimAlpha).toBe(BACK_PILL_SCRIM_ALPHA);
  });

  test.each(TYPE_NAMES)('the chevron on the %s hero, dark scheme', (type: string) => {
    expectColorContrast(
      colours.white,
      composite(scrimInk, scrimAlpha, hexForClass(bgClassForType(type))),
      'nonText',
    );
  });

  test('the chevron on the navy compact bar, dark scheme', () => {
    expectColorContrast(colours.white, composite(scrimInk, scrimAlpha, colours.navy), 'nonText');
  });

  // The light variant is opaque, so what is under it does not matter.
  test('the chevron on the light pill', () => {
    expectColorContrast(colours.darkGrey, colours.white, 'nonText');
  });
});

describe('WCAG 1.4.3 Contrast (Minimum) — type badges in dark mode', () => {
  // The card badge dims to a tonal wash in dark: bg-type-X/25 over the card's near-black, with
  // text-white/90. Eighteen more pairs the design system composes; the matrix imported the light
  // decision and the hero decision and never this one. All eighteen clear, which is exactly why
  // nobody noticed it was unmeasured.
  test.each(TYPE_NAMES)('%s badge text clears AA on its dark tonal wash', (type: string) => {
    const wash = composite(hexForClass(bgClassForType(type)), 0.25, colours.black);
    expectColorContrast(composite(colours.white, 0.9, wash), wash);
  });
});

describe('WCAG 1.4.3 Contrast (Minimum) — the host tab bar', () => {
  // The host's own chrome, which the matrix's contract covers and was not measuring. The focused
  // tab's label takes tabBarActiveTintColor verbatim at 10pt, on the navigator's card: white in
  // light, the near-black neutral in dark. colours.blue measured 3.48:1 and 3.74:1 there.
  test('the focused tab label on the light bar', () => {
    expectColorContrast(colours.blueText, colours.white);
  });

  test('the focused tab label on the dark bar', () => {
    expectColorContrast(colours.blueTextDark, colours.black);
  });

  // One tab is always unfocused, so this pair is always on screen. Left unset, react-navigation
  // mixes the theme's text 50% into the bar and produces 3.27:1 on the light bar.
  test('the unfocused tab label on the light bar', () => {
    expectColorContrast(colours.darkGrey, colours.white);
  });

  test('the unfocused tab label on the dark bar', () => {
    expectColorContrast(colours.lightGrey, colours.black);
  });
});

describe('WCAG 1.4.3 Contrast (Minimum) — the federation chrome', () => {
  // Two surfaces the operational layer added, both painting tokens rather than colours of their
  // own, and both carrying text small enough to need the full 4.5:1.
  //
  // The host's banner is a filled pill with a white line on it, and the fill says which mode the
  // launch resolved to. This block measures three of its four fills; the fourth, colours.red for an
  // unresolved launch, is measured against white in the 'status colours' block.
  test('the banner line on the dev-mode fill', () => {
    expectColorContrast(colours.white, colours.darkGrey);
  });

  test('the banner line on the CDN-mode fill', () => {
    expectColorContrast(colours.white, colours.blueText);
  });

  test('the banner line on the bundled-mode fill', () => {
    expectColorContrast(colours.white, colours.purple);
  });

  // The Pokédex header's version chip, beside the party counter and painting the same pill: the
  // neutral surface in light, and in dark the translucent white the counter uses, composited over
  // the screen's navy. The light half is colours.darkGrey on colours.offGrey, already measured in
  // the 'body text on light surfaces' block.
  test('the version chip on its dark pill', () => {
    expectColorContrast(colours.lightGrey, composite(colours.white, 0.1, colours.navy));
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
  // real surface moved four types below AA. This check proves the two constants agree with each
  // other; that the component still uses them rather than a literal is proved in
  // src/components/__tests__/components.accessibility.tsx, because both constants are exported
  // from the same module and neither of them changes when the component stops using them.
  test('the class TypeBadge paints encodes the alpha the map was computed against', () => {
    expect(HERO_SCRIM_CLASS).toBe(`bg-white/${Math.round(HERO_SCRIM_ALPHA * 100)}`);
  });
});
