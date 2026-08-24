module.exports = {
  preset: '@react-native/jest-preset',
  // The federated state module has no resolvable source under Jest; the mock
  // repeats its side effect (reducer injection) so boot readiness is testable.
  moduleNameMapper: {
    '^partyApp/partySlice$': '<rootDir>/__mocks__/partyApp-partySlice.js',
  },
  // @react-navigation, react-native-screens, and the Redux stack (react-redux, @reduxjs/toolkit and
  // its ESM-only deps immer/redux/reselect/redux-thunk) ship ES modules. The base preset only sends
  // React Native's own packages through Babel: its transformIgnorePatterns lists react-native,
  // @react-native and @react-native-community, and nothing else. Add these too or Jest tries to
  // require raw `export` syntax and throws before any test runs.
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|@react-navigation|react-native-screens|react-redux|@reduxjs/toolkit|immer|redux|reselect|redux-thunk)/)',
  ],
};
