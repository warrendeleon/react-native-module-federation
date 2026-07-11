module.exports = {
  preset: '@react-native/jest-preset',
  // @react-navigation, react-native-screens, and the Redux stack (react-redux, @reduxjs/toolkit and
  // its ESM-only deps immer/redux/reselect/redux-thunk) ship ES modules; the base preset only lets
  // react-native itself through Babel, so whitelist these too or Jest tries to require raw `export`
  // syntax and throws before any test runs.
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|@react-navigation|react-native-screens|react-redux|@reduxjs/toolkit|immer|redux|reselect|redux-thunk)/)',
  ],
};
