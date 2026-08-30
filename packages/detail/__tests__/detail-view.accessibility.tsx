// --- The shared view carries its own accessibility suite.
//
// This package ships one screen to two apps that never import each other. If the screen is
// checked here, at the source, both consumers inherit the result, and when something fails one
// patch release repairs both of them without either team touching their code.
//
// The tests hand the view its props directly. That is the same seam the List and Party apps use
// to feed it, so nothing here needs a store, a query client or a navigator.

import React from 'react';
import { Image } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import type { PokemonDetail } from '@pokedex/contracts';
import {
  HERO_SCRIM_ALPHA,
  colourForType,
  colours,
  textOnHeroScrimClass,
  textOnTypeClass,
} from '@pokedex/ui';
import {
  createThemedRender,
  expectAccessibilityProps,
  expectColorContrast,
  expectMinTouchTarget,
  expectNonColourCue,
} from '@pokedex/a11y-testing';

import { PokemonDetailView } from '../src';

const renderWithTheme = createThemedRender(require('@pokedex/ui/tailwind.preset.js'));

// The safe-area metrics a device would supply. Without a provider the styling stack's
// safe-area shim has no component to read, which is a test-environment detail rather than
// anything the screen does.
const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

const charizard: PokemonDetail = {
  id: 6,
  name: 'Charizard',
  spriteUri: 'sprite://6',
  // Rock and ghost are two of the four types whose foreground *changes* between the solid fill
  // and the hero scrim. A fixture of Fire and Flying takes ink on both surfaces and scores above
  // 11:1 either way, so it cannot tell a correct hero badge from one using the fill's decision.
  types: ['Rock', 'Ghost'],
  heightM: 1.7,
  weightKg: 90.5,
  abilities: ['Blaze'],
  stats: [
    { name: 'HP', value: 78 },
    { name: 'Attack', value: 84 },
    { name: 'Speed', value: 100 },
  ],
  flavourText: 'It spits fire hot enough to melt boulders.',
};

type ViewProps = React.ComponentProps<typeof PokemonDetailView>;

function view(overrides: Partial<ViewProps> = {}) {
  // `loading` and `error` are required on the view's props, so the spread is merged over
  // explicit defaults rather than handed to the component as possibly-undefined.
  const props: ViewProps = {
    pokemon: charizard,
    loading: false,
    error: false,
    onRetry: () => {},
    ...overrides,
  };
  return (
    <SafeAreaProvider initialMetrics={metrics}>
      <PokemonDetailView {...props} />
    </SafeAreaProvider>
  );
}

describe('WCAG 4.1.2 Name, Role, Value — the Add action', () => {
  test('the enabled Add button announces itself as a button', async () => {
    const { getByRole } = await renderWithTheme(view({ onAddToParty: () => {} }));
    expectAccessibilityProps(getByRole('button'), { role: 'button' });
  });

  // The state a screen reader reports is the half that no visual review catches: the button
  // greys out on screen whatever it announces, so a sighted reviewer signs it off either way.
  test('the disabled Add button reports that it is disabled', async () => {
    const { getByRole } = await renderWithTheme(
      view({ onAddToParty: () => {}, addDisabled: true, addLabel: 'Party is full' }),
    );
    expectAccessibilityProps(getByRole('button'), {
      role: 'button',
      state: { disabled: true },
    });
  });
});

describe('WCAG 2.5.5 Target Size — the Add action', () => {
  // 44pt is Apple's recommended default control size, adopted as this project's bar. It is not
  // Apple's floor either: the Human Interface Guidelines put the iOS minimum at 28x28. And it is
  // not the AA requirement: SC 2.5.5 is Level AAA, and WCAG 2.2's AA criterion (2.5.8) asks for
  // 24x24. Clearing 44 clears the AA bar; Android's 48dp guidance is the one to watch on that side.
  test('the Add button declares at least 44pt on both axes', async () => {
    const { getByRole } = await renderWithTheme(view({ onAddToParty: () => {} }));
    expectMinTouchTarget(getByRole('button'));
  });
});

describe('WCAG 1.1.1 Non-text Content — the sprite', () => {
  // The sprite repeats the heading beside it, so the right answer is to hide it rather than to
  // label it twice. Either answer is acceptable; what is not acceptable is neither, which is
  // what an unlabelled visible image would be. This asserts the sprite element itself, because
  // a check that falls back to "well, there is a heading" would pass a regression that removed
  // the hiding props.
  test('the hero sprite is explicitly decorative, or else it is labelled', async () => {
    const { UNSAFE_getAllByType } = await renderWithTheme(view());
    const sprites = UNSAFE_getAllByType(Image).filter(
      image => (image.props.source as { uri?: string })?.uri === charizard.spriteUri,
    );
    expect(sprites).toHaveLength(1);

    const sprite = sprites[0];
    const label = sprite.props.accessibilityLabel ?? sprite.props['aria-label'];
    const hidden =
      sprite.props.accessibilityElementsHidden === true &&
      sprite.props.importantForAccessibility === 'no-hide-descendants';

    if (label) {
      expect(String(label)).toContain(charizard.name);
    } else {
      // Hidden on both platforms, not just one: iOS reads accessibilityElementsHidden and
      // Android reads importantForAccessibility, so one without the other leaves it exposed.
      expect(hidden).toBe(true);
    }
  });
});

describe('WCAG 1.4.3 Contrast (Minimum) — the hero', () => {
  // The hero paints the type colour full-strength and puts the name straight onto it, while the
  // type badges sit on a translucent scrim over the same colour. Two surfaces, two decisions.
  // packages/ui already proves both decisions are right; what only this package can check is
  // that the screen composes the hero one, so this renders and reads the badge rather than
  // recomputing a number the design system's own matrix already asserts.
  test.each(charizard.types)('the %s badge on the hero uses the scrim decision', async type => {
    const { getByText } = await renderWithTheme(view());
    // The class, not the resolved colour. `nativewind/test` compiles only the class strings on
    // the tree handed to `render`, so a class a child component chooses never resolves here —
    // reading `style.color` would give undefined for both the right answer and the wrong one.
    // The class string is the decision, and it is what changes if the hero variant is dropped.
    const className = String(getByText(type).props.className);
    expect(className).toContain(textOnHeroScrimClass(type));
    if (textOnHeroScrimClass(type) !== textOnTypeClass(type)) {
      // For these types the two surfaces disagree, so this also catches a badge rendered with
      // the solid fill's decision.
      expect(className).not.toContain(textOnTypeClass(type));
    }
  });

  // The dex number under the name. It muted itself to text-black/60 (or text-white/70 on the
  // dark fills) until the eighth audit, one line below a comment explaining that the hero asks
  // the token rather than assuming — and text-black resolves to #2E3138, the neutral the preset
  // warns is not a foreground. It measured 2.21:1 on water and failed sixteen of the eighteen
  // fills. No alpha clears all of them, so the line now asks the same token the name does.
  test('the dex number takes the hero decision, at full strength', async () => {
    const { getByText } = await renderWithTheme(view());
    const dexNumber = `#${String(charizard.id).padStart(3, '0')}`;
    const className = String(getByText(dexNumber).props.className);
    expect(className).toContain(textOnTypeClass(charizard.types[0]));
    // An alpha suffix is what the muted variant looked like, and it is what would come back.
    expect(className).not.toMatch(/text-(black|white)\/\d+/);
  });

  test.each(charizard.types)('the %s badge clears AA on the surface it is drawn on', type => {
    const scrimHex = compositeWhite(HERO_SCRIM_ALPHA, colourForType(type));
    const foreground = textOnHeroScrimClass(type) === 'text-white' ? colours.white : colours.typeInk;
    expectColorContrast(foreground, scrimHex, 'normalText');
  });
});

describe('WCAG 1.4.1 Use of Color — the stat rows', () => {
  test('each stat is readable as its own number, not only as a coloured bar', async () => {
    const { getAllByRole } = await renderWithTheme(view());
    const bars = getAllByRole('progressbar');
    expect(bars.length).toBe(charizard.stats.length);
    // The value itself, not merely "a string": an empty text would satisfy expect.any(String)
    // and this test is named for the number being readable.
    bars.forEach((bar, index) => {
      expect(bar.props.accessibilityValue?.text).toBe(String(charizard.stats[index].value));
      expectNonColourCue(bar, String(charizard.stats[index].value));
    });
  });
});

/** Composites white at `alpha` over `base`, the way the hero's scrim paints at runtime. */
function compositeWhite(alpha: number, base: string): string {
  const channel = (index: number) => parseInt(base.replace('#', '').substr(index * 2, 2), 16);
  const mix = (index: number) => Math.round(alpha * 255 + (1 - alpha) * channel(index));
  return `#${[0, 1, 2].map(i => mix(i).toString(16).padStart(2, '0')).join('')}`;
}
