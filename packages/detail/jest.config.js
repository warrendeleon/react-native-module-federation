// Same preset as the design system and both remotes: the accessibility bar is a package every
// side installs, not a convention each side re-implements. It extends the React Native preset,
// so the view's existing suite runs unchanged.
const preset = require('@pokedex/a11y-testing/jest-preset');

module.exports = {
  preset: '@pokedex/a11y-testing',
  moduleNameMapper: {
    ...preset.moduleNameMapper,
    '^react-native-reanimated$': '<rootDir>/__mocks__/react-native-reanimated.js',
  },
};
