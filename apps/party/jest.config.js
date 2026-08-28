// The shared accessibility bar arrives as a preset. It extends the React Native preset, so the
// suites this app already had keep running, and its allowlist is widened rather than replaced —
// this app also pulls in React Navigation and the Redux stack.
const preset = require('@pokedex/a11y-testing/jest-preset');

module.exports = {
  preset: '@pokedex/a11y-testing',
  // Reanimated drives animations through the JSI, which a Jest process has no runtime for;
  // the stand-in in __mocks__ replaces it, same as the other apps.
  moduleNameMapper: {
    ...preset.moduleNameMapper,
    '^react-native-reanimated$': '<rootDir>/__mocks__/react-native-reanimated.js',
  },
  // @gluestack-ui/utils ships .jsx files, and the base preset's transform pattern covers
  // (js|ts|tsx) only, so they would reach Jest untransformed and throw on their import
  // statements. Same transformer, one extension wider.
  // @react-navigation, react-native-screens, and the Redux stack (react-redux, @reduxjs/toolkit and
  // its ESM-only deps immer/redux/reselect/redux-thunk) ship ES modules. The base preset only sends
  // React Native's own packages through Babel: its transformIgnorePatterns lists react-native,
  // @react-native and @react-native-community, and nothing else. Add these too or Jest tries to
  // require raw `export` syntax and throws before any test runs.
  // The preset's list covers the styling stack and every @pokedex package; this app adds the
  // navigation and Redux packages that only it pulls in.
  transformIgnorePatterns: [
    `node_modules/(?!(${[
      ...preset.uncompiledPackages,
      '@react-navigation',
      'react-native-screens',
      'react-redux',
      '@reduxjs/toolkit',
      'immer',
      'redux',
      'reselect',
      'redux-thunk',
    ].join('|')})/)`,
  ],
};
