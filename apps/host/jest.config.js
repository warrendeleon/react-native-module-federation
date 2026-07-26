module.exports = {
  preset: '@react-native/jest-preset',
  // @react-navigation and react-native-screens ship ES modules. The base preset only sends React
  // Native's own packages through Babel: its transformIgnorePatterns lists react-native,
  // @react-native and @react-native-community, and nothing else. Add these two or Jest tries to
  // require raw `export` syntax and throws before any test runs.
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|@react-navigation|react-native-screens)/)',
  ],
};
