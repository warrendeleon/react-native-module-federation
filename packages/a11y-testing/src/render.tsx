// --- The NativeWind-aware render.
//
// A plain RNTL render leaves className inert: the tree mounts, but every colour and size the
// design system expresses as a class resolves to nothing, so a contrast or touch-target
// assertion reads undefined and passes vacuously. `render` from nativewind/test compiles the
// Tailwind config for the test tree instead, so `bg-type-fire` becomes a real hex.
//
// Consumers bind this to the design system's own preset, which is what makes a token assertion
// in a remote's suite mean the same thing as the same assertion in the design system's suite:
//
//   const render = createThemedRender(require('@pokedex/ui/tailwind.preset.js'));
//
// The render is async — nativewind/test compiles CSS before mounting — so tests await it. ---

import { render as renderWithNativeWind } from 'nativewind/test';

export type TailwindPreset = Record<string, unknown>;

export type ThemedRenderOptions = {
  /** 'light' (default) or 'dark'; drives which theme's tokens resolve. */
  colorScheme?: 'light' | 'dark';
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
    { colorScheme = 'light', config }: ThemedRenderOptions = {},
  ): Promise<ThemedRenderResult> {
    return renderWithNativeWind(component, {
      config: {
        ...(preset as object),
        ...(config ?? {}),
        // NativeWind reads the scheme from the config's darkMode strategy plus the rendered
        // class list; 'class' keeps it deterministic in a test process with no OS appearance.
        darkMode: 'class',
      } as never,
      ...(colorScheme === 'dark' ? { className: 'dark' } : {}),
    } as never);
  };
}

export {
  act,
  screen,
  fireEvent,
  within,
} from 'nativewind/test';
