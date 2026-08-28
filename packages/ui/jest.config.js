// The accessibility bar arrives as a preset, not a convention: @pokedex/a11y-testing extends the
// React Native preset, so the suites that were here before this package gained an accessibility
// layer keep running unchanged, and every new check resolves NativeWind classes to real styles.
const preset = require('@pokedex/a11y-testing/jest-preset');

module.exports = {
  preset: '@pokedex/a11y-testing',
  moduleNameMapper: {
    ...preset.moduleNameMapper,
    '^react-native-reanimated$': '<rootDir>/__mocks__/react-native-reanimated.js',
  },
};
