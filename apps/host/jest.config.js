module.exports = {
  preset: '@react-native/jest-preset',
  // @react-navigation and react-native-screens ship ES modules. The base preset only sends React
  // Native's own packages through Babel: its transformIgnorePatterns lists react-native,
  // @react-native and @react-native-community, and nothing else. Add these too or Jest tries to
  // require raw `export` syntax and throws before any test runs.
  //
  // The state libraries are absent on purpose. @tanstack/react-query and zustand both ship a
  // CommonJS build and resolve to it under Jest's require conditions, so neither needs
  // transforming. The Redux stack did, and so did immer, redux, reselect and redux-thunk.
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|@react-navigation|react-native-screens)/)',
  ],
};
