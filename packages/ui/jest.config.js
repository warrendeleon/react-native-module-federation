// The accessibility bar arrives as a preset, not a convention: @pokedex/a11y-testing extends the
// React Native preset, so the suites that were here before this package gained an accessibility
// layer keep running unchanged, and a class written in a test's own JSX resolves to a real style.
// Only that: `nativewind/test` compiles the class strings on the tree handed to `render`, so a
// class a component chooses inside its own render never compiles. Assertions here read the class
// a component picked, not the colour it painted; the paint belongs to the device layer.
const preset = require('@pokedex/a11y-testing/jest-preset');

module.exports = {
  preset: '@pokedex/a11y-testing',
  moduleNameMapper: {
    ...preset.moduleNameMapper,
    '^react-native-reanimated$': '<rootDir>/__mocks__/react-native-reanimated.js',
  },
};
