// --- The NativeWind-aware render.
//
// A plain RNTL render leaves className inert. `render` from nativewind/test compiles the Tailwind
// config for the test tree instead, so a class written in the test's own JSX becomes a real hex.
//
// Two limits, both measured rather than assumed. `nativewind/test` compiles only the class strings
// on the tree handed to `render`, so a class a component picks inside its own render never
// compiles. And in a consumer, Jest resolves `@pokedex/ui` through `main` to bob's build, whose
// JSX is already compiled, so nothing routes className through the styling runtime at all: the
// same `<Box className="bg-type-fire" />` resolves to a hex in packages/ui and to `{}` in
// apps/list. Assert the class a component chose, not the colour it painted. The colour belongs to
// the token matrix in the package that owns the tokens, and to the device layer after that.
//
// Consumers bind this to the design system's own preset:
//
//   const render = createThemedRender(require('@pokedex/ui/tailwind.preset.js'));
//
// The render is async: nativewind/test compiles CSS before mounting, so tests await it.
//
// There is no dark-theme option here, and the omission is deliberate. An earlier version took a
// `colorScheme: 'dark'` and passed `className: 'dark'` down to the render, which reads plausibly
// and does nothing: `className` belongs to renderCurrentTest, not to render, and an unknown key
// is forwarded to RNTL and ignored. Wrapping the tree in a `dark` class does not resolve the
// variants either. So `bg-white dark:bg-navy` came back as #ffffff whichever way it was asked,
// and any dark-theme assertion written against it would have been measuring light tokens while
// passing. That is the exact fault this package exists to catch, so the option is gone rather
// than documented. Dark rendering belongs to the device layer until something here can prove it. ---

import { render as renderWithNativeWind } from 'nativewind/test';

export type TailwindPreset = Record<string, unknown>;

export type ThemedRenderOptions = {
  /** Extra Tailwind config merged over the preset, for a one-off token in a single test. */
  config?: Record<string, unknown>;
};

type NativeWindRender = typeof renderWithNativeWind;
export type ThemedRenderResult = Awaited<ReturnType<NativeWindRender>>;

/**
 * Binds a Tailwind preset once and returns the render every suite in that package uses.
 *
 * Taking the preset as an argument rather than importing @pokedex/ui keeps this package free of
 * a dependency on the design system: the a11y bar is a tool, not a member of the federation.
 */
export function createThemedRender(preset: TailwindPreset) {
  return function renderWithTheme(
    component: React.ReactElement,
    { config }: ThemedRenderOptions = {},
  ): Promise<ThemedRenderResult> {
    return renderWithNativeWind(component, {
      config: {
        ...(preset as object),
        ...(config ?? {}),
        // 'class' keeps the dark strategy deterministic in a test process with no OS appearance.
        darkMode: 'class',
      } as never,
    } as never);
  };
}

export {
  act,
  screen,
  fireEvent,
  within,
} from 'nativewind/test';
