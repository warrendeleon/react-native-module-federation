const preset = require('@react-native/jest-preset');

module.exports = {
  preset: '@react-native/jest-preset',
  moduleNameMapper: {
    '^react-native-reanimated$': '<rootDir>/__mocks__/react-native-reanimated.js',
  },
  // Same widening the consuming apps carry: gluestack ships .jsx, and the styling stack
  // ships ES modules the base preset would not transform.
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': preset.transform['^.+\\.(js|ts|tsx)$'],
    '^.+\\.(bmp|gif|jpg|jpeg|mp4|png|psd|svg|webp)$':
      preset.transform['^.+\\.(bmp|gif|jpg|jpeg|mp4|png|psd|svg|webp)$'],
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|nativewind|react-native-css-interop|@gluestack-ui|@expo/html-elements|react-native-safe-area-context)/)',
  ],
};
