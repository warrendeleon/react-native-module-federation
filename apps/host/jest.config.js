module.exports = {
  preset: '@react-native/jest-preset',
  // @react-navigation and react-native-screens ship ES modules; the base preset only lets
  // react-native itself through Babel, so whitelist these too or Jest tries to require raw
  // `export` syntax and throws before any test runs.
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|@react-navigation|react-native-screens)/)',
  ],
};
