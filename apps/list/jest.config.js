const preset = require('@react-native/jest-preset');

module.exports = {
  preset: '@react-native/jest-preset',
  // Reanimated drives animations through the JSI, which a Jest process has no runtime for, so it
  // is replaced by the stand-in in __mocks__. @pokedex/detail's collapse animation resolves to
  // the same mock.
  moduleNameMapper: {
    '^react-native-reanimated$': '<rootDir>/__mocks__/react-native-reanimated.js',
    // The double-tap test imports the party app's REAL slice; pinning contracts to this
    // app's copy keeps that file injecting into the same rootReducer instance the test's
    // store was built from — the singleton, simulated in Jest.
    '^@pokedex/contracts$': '<rootDir>/node_modules/@pokedex/contracts',
    // ListStack imports global.css for the federated styling runtime; Jest gets a stub.
    '\\.css$': '<rootDir>/__mocks__/styleMock.js',
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
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|@react-navigation|react-native-screens|react-redux|@reduxjs/toolkit|immer|redux|reselect|redux-thunk|@pokedex/ui|nativewind|react-native-css-interop|@gluestack-ui|@expo/html-elements|@pokedex/detail)/)',
  ],
};
