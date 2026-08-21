const preset = require('@react-native/jest-preset');

module.exports = {
  preset: '@react-native/jest-preset',
  // The federated state module has no resolvable source under Jest; the mock
  // repeats its side effect (reducer injection) so boot readiness is testable.
  moduleNameMapper: {
    '^partyApp/partySlice$': '<rootDir>/__mocks__/partyApp-partySlice.js',
  },
  // @gluestack-ui/utils ships .jsx files, and the base preset's transform pattern covers
  // (js|ts|tsx) only, so they would reach Jest untransformed and throw on their import
  // statements. Same transformer, one extension wider.
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': preset.transform['^.+\\.(js|ts|tsx)$'],
    '^.+\\.(bmp|gif|jpg|jpeg|mp4|png|psd|svg|webp)$':
      preset.transform['^.+\\.(bmp|gif|jpg|jpeg|mp4|png|psd|svg|webp)$'],
  },
  // @react-navigation, react-native-screens, and the Redux stack (react-redux, @reduxjs/toolkit and
  // its ESM-only deps immer/redux/reselect/redux-thunk) ship ES modules. The base preset only sends
  // React Native's own packages through Babel: its transformIgnorePatterns lists react-native,
  // @react-native and @react-native-community, and nothing else. Add these too or Jest tries to
  // require raw `export` syntax and throws before any test runs.
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|@react-navigation|react-native-screens|react-redux|@reduxjs/toolkit|immer|redux|reselect|redux-thunk|@pokedex/ui|nativewind|react-native-css-interop|@gluestack-ui|@expo/html-elements)/)',
  ],
};
