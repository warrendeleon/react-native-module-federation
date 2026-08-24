const preset = require('@react-native/jest-preset');

module.exports = {
  preset: '@react-native/jest-preset',
  moduleNameMapper: {
    '^react-native-reanimated$': '<rootDir>/__mocks__/react-native-reanimated.js',
  },
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': preset.transform['^.+\\.(js|ts|tsx)$'],
    '^.+\\.(bmp|gif|jpg|jpeg|mp4|png|psd|svg|webp)$':
      preset.transform['^.+\\.(bmp|gif|jpg|jpeg|mp4|png|psd|svg|webp)$'],
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|nativewind|react-native-css-interop|@gluestack-ui|@expo/html-elements|react-native-safe-area-context|@pokedex/ui)/)',
  ],
};
