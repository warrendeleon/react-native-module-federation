module.exports = {
  preset: '@react-native/jest-preset',
  // This remote now imports React Navigation, so it needs the allowance the host got in post 4.
  // @react-navigation and react-native-screens ship ES modules, and the base preset only sends React
  // Native's own packages through Babel: its transformIgnorePatterns lists react-native,
  // @react-native and @react-native-community, and nothing else.
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|@react-navigation|react-native-screens)/)',
  ],
};
