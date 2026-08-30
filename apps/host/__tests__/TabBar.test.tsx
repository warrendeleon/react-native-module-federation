/**
 * The host's own chrome, checked here because nothing else can see it.
 *
 * An ordinary test, not one of the five accessibility suites: it asserts a source fact rather
 * than rendering a screen, and the host ships no accessibility report.
 *
 * @pokedex/ui's token matrix proves the readable pairs clear AA on each bar surface, but a matrix
 * measures pairs, not the choices an app makes: reverting the active tint to colours.blue left
 * every one of that package's checks green while the focused tab label sat at 3.48:1. The pair and
 * the use have to be checked in different places, and this is the second half.
 *
 * Both tints are checked. The first version of this file guarded only the active one, and the
 * unfocused label — which is on screen whenever the active one is, because one tab is always
 * unfocused — was left to react-navigation's derived default at 3.27:1.
 *
 * It reads source rather than a render. The tints are navigator options resolved inside
 * React Navigation, so they reach no element this suite can query.
 */
import { readFileSync } from 'node:fs';

describe('WCAG 1.4.3 Contrast (Minimum) — the tab bar', () => {
  const source = readFileSync(require.resolve('../App.tsx'), 'utf8');

  test('the focused tab label takes the readable blue, per theme', () => {
    expect(source).toMatch(
      /tabBarActiveTintColor:\s*mode === 'dark' \? colours\.blueTextDark : colours\.blueText/,
    );
  });

  test('the unfocused tab label is stated, not inherited', () => {
    expect(source).toMatch(
      /tabBarInactiveTintColor:\s*mode === 'dark' \? colours\.lightGrey : colours\.darkGrey/,
    );
  });

  test('neither label is painted with the brand fill', () => {
    expect(source).not.toMatch(/tabBar(Active|Inactive)TintColor:\s*colours\.blue\b/);
  });
});
