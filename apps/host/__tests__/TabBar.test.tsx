/**
 * The host's own chrome, checked here because nothing else can see it.
 *
 * An ordinary test, not one of the five accessibility suites: it asserts a source fact rather
 * than rendering a screen, and the host ships no accessibility report.
 *
 * @pokedex/ui's token matrix proves the readable blues clear AA on each bar surface, but a matrix
 * measures pairs, not the choices an app makes: reverting this tint to colours.blue left all
 * ninety-nine of its checks green while the focused tab label sat at 3.48:1. The pair and the use
 * have to be checked in different places, and this is the second half.
 *
 * It reads source rather than a render. The tint is a navigator option resolved inside
 * React Navigation, so it reaches no element this suite can query.
 */
import { readFileSync } from 'node:fs';

describe('WCAG 1.4.3 Contrast (Minimum) — the tab bar', () => {
  const source = readFileSync(require.resolve('../App.tsx'), 'utf8');

  test('the focused tab label takes the readable blue, per theme', () => {
    expect(source).toMatch(
      /tabBarActiveTintColor:\s*mode === 'dark' \? colours\.blueTextDark : colours\.blueText/,
    );
  });

  test('the focused tab label is not painted with the brand fill', () => {
    expect(source).not.toMatch(/tabBarActiveTintColor:\s*colours\.blue\b/);
  });
});
