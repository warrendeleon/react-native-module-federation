// --- The preset's own guards.
//
// Two lines in jest-preset.js can switch the whole accessibility layer off without any suite
// going red. Removing `nativewind/babel` makes className inert, so a class-derived assertion
// reads undefined and passes vacuously. Removing `accessibility` from testMatch stops the
// accessibility files being collected at all, and Jest exits 0 having run a smaller suite.
//
// Neither is caught by the suites themselves, because a suite that does not run cannot fail.
// So the preset is asserted directly, here, in the package that ships it.

const micromatch = require('micromatch');
const preset = require('../jest-preset.js');

describe('the preset keeps the styling stack in the transform', () => {
  test('nativewind/babel is in the babel presets', () => {
    const transform = preset.transform['^.+\\.(js|jsx|ts|tsx)$'];
    expect(transform).toBeDefined();
    const presets = (transform[1] as { presets: string[] }).presets;
    // Without this, a class written in a test's own JSX never becomes style in this package's
    // own suites. It is not what makes a consumer's class assertions work: there Jest loads the
    // design system's built lib/, whose JSX is already compiled, so no className resolves either
    // way. The guard is here because dropping the entry is silent, not because it reaches every consumer.
    expect(presets).toContain('nativewind/babel');
  });

  test("the interop's matcher setup is registered", () => {
    expect(preset.setupFilesAfterEnv.some((f: string) => f.includes('react-native-css-interop'))).toBe(
      true,
    );
  });

  test('the styling stack and every @pokedex package are transformed rather than ignored', () => {
    for (const required of ['nativewind', 'react-native-css-interop', '@pokedex']) {
      expect(preset.uncompiledPackages).toContain(required);
    }
    // The pattern is what Jest actually reads; the array above is only what builds it.
    expect(preset.transformIgnorePatterns[0]).toContain('nativewind');
    expect(preset.transformIgnorePatterns[0]).toContain('@pokedex');
  });
});

describe('the preset keeps collecting the accessibility layer', () => {
  test('testMatch picks up *.accessibility.* as well as *.test.*', () => {
    const patterns = preset.testMatch.join(' ');
    expect(patterns).toContain('accessibility');
    expect(patterns).toContain('test');
  });

  // Matched with the same library Jest uses, rather than a hand-rolled regex: a guard that
  // tests my glob translation instead of the preset's patterns would prove nothing.
  test.each([
    'src/tokens/__tests__/contrast.accessibility.ts',
    'src/components/__tests__/components.accessibility.tsx',
    '__tests__/detail-view.accessibility.tsx',
    '__tests__/ListStack.accessibility.tsx',
  ])('%s is collected', path => {
    expect(micromatch.isMatch(path, preset.testMatch)).toBe(true);
  });

  test('the ordinary suites keep being collected too', () => {
    expect(micromatch.isMatch('__tests__/pokemon-card.test.tsx', preset.testMatch)).toBe(true);
  });

  test('a source file is not mistaken for a suite', () => {
    expect(micromatch.isMatch('src/components/type-badge.tsx', preset.testMatch)).toBe(false);
  });
});
