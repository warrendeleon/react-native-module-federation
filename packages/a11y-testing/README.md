# @pokedex/a11y-testing

The accessibility bar for the federation, shipped as a package.

Independent teams drift on quality bars the same way they drift on greys. The fix is the same one
the design system used: move the definition into a versioned package at the seam. A convention
drifts; a package release does not.

This is the first `@pokedex` package that never reaches a bundle. It is a devDependency
everywhere, so it stays out of every Module Federation shared map.

## What is in it

| Export | What it does |
|---|---|
| `jest-preset.js` | Extends `@react-native/jest-preset`, adds `nativewind/babel` to the transform and the interop's `toHaveStyle` matcher. Without it `className` is an inert prop in tests and every colour assertion reads `undefined`. |
| `createThemedRender(preset)` | Binds a Tailwind preset once and returns an async render that resolves classes to real styles. |
| `expectColorContrast` | WCAG 1.4.3 / 1.4.11 against the current relative-luminance definition. |
| `expectMinTouchTarget`, `expectMinHitSlop` | The project's 44pt bar on declared sizes. |
| `expectAccessibilityProps` | Name, role and — the half teams forget — state. |
| `expectScreenReaderAnnouncement`, `expectNonColourCue` | Status regions and SC 1.4.1. |
| `wcag-criteria.js` | The WCAG 2.1 A + AA catalogue, tagged by the layer that can verify each criterion. |
| `reporter.js` | Turns a suite run into one `accessibility-report.md`. |

## Using it

```js
// jest.config.js
const preset = require('@pokedex/a11y-testing/jest-preset');

module.exports = {
  preset: '@pokedex/a11y-testing',
  // Widen the allowlist rather than replacing it, or the styling stack silently drops out.
  transformIgnorePatterns: [
    `node_modules/(?!(${[...preset.uncompiledPackages, '@react-navigation'].join('|')})/)`,
  ],
};
```

```tsx
const renderWithTheme = createThemedRender(require('@pokedex/ui/tailwind.preset.js'));

const { getByRole } = await renderWithTheme(<AddButton disabled />);
expectAccessibilityProps(getByRole('button'), { role: 'button', state: { disabled: true } });
```

Name every accessibility `describe` after its criterion — `WCAG 4.1.2 …` — and the reporter groups
the run by criterion on its own.

## Two things worth knowing

**`nativewind/test` and `react-native-css-interop/test` are real, shipped and undocumented.**
nativewind.dev has no testing section. They power NativeWind's own suite. Versions are pinned
deliberately (nativewind 4.2.6, css-interop 0.2.6, RNTL ^13.3.3 — the pairing this is proven
against) and re-checked when NativeWind moves.

**Class-derived sizes do not survive the test renderer.** Under `nativewind/test` a rem resolves to
about 14, so `h-11` is not 44. The touch-target helper reads declared style and props, and throws
rather than passing when there is nothing measurable — a silent pass would report a control as
accessible precisely when the test could not see it.

## What it cannot check

Token pairs, not paint. Focusable elements present, not traversal order. Declared sizes, not hit
regions after clipping. Those need a device audit (`performAccessibilityAudit` on iOS, the
Accessibility Test Framework on Android), and whether a label reads well stays a manual VoiceOver
and TalkBack pass. A clean automated run is necessary, not sufficient.

## The bar itself

44pt is Apple's recommended default control size, adopted here as the project's bar. It is **not**
a WCAG AA requirement: SC 2.5.5 Target Size is Level AAA, and WCAG 2.2's AA criterion (2.5.8) asks
for 24×24 with exceptions. Android's guidance is 48dp. Forty-four clears all of them.
