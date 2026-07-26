module.exports = {
  preset: '@react-native/jest-preset',
  // Same allowance as the host and the list remote, for the same reason: @react-navigation and
  // react-native-screens ship ES modules, and the base preset only sends React Native's own
  // packages through Babel.
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|@react-navigation|react-native-screens)/)',
  ],
};
