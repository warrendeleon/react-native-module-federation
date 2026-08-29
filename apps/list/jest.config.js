// The shared accessibility bar arrives as a preset. It extends the React Native preset, so the
// suites this app already had keep running, and its allowlist is widened rather than replaced.
// This app also pulls in React Navigation and the Redux stack.
const preset = require('@pokedex/a11y-testing/jest-preset');

module.exports = {
  preset: '@pokedex/a11y-testing',
  // Reanimated drives animations through the JSI, which a Jest process has no runtime for, so it
  // is replaced by the stand-in in __mocks__. @pokedex/detail's collapse animation resolves to
  // the same mock.
  moduleNameMapper: {
    ...preset.moduleNameMapper,
    '^react-native-reanimated$': '<rootDir>/__mocks__/react-native-reanimated.js',
    // The double-tap test imports the party app's REAL slice; pinning contracts to this
    // app's copy keeps that file injecting into the same rootReducer instance the test's
    // store was built from: the singleton, simulated in Jest.
    '^@pokedex/contracts$': '<rootDir>/node_modules/@pokedex/contracts',
    // The real party slice is imported from a sibling app, so Node would otherwise resolve
    // its Redux Toolkit import through apps/party/node_modules. Keep this suite independent
    // of whether another app has been installed first.
    '^@reduxjs/toolkit$': '<rootDir>/node_modules/@reduxjs/toolkit',
    // ListStack imports global.css for the federated styling runtime; Jest gets a stub.
    '\\.css$': '<rootDir>/__mocks__/styleMock.js',
  },
  // @react-navigation, react-native-screens, and the Redux stack (react-redux, @reduxjs/toolkit and
  // its ESM-only deps immer/redux/reselect/redux-thunk) ship ES modules. The base preset only sends
  // React Native's own packages through Babel: its transformIgnorePatterns lists react-native,
  // @react-native and @react-native-community, and nothing else. Add these too or Jest tries to
  // require raw `export` syntax and throws before any test runs.
  // The preset's list covers the styling stack and every @pokedex package; this app adds the
  // navigation and Redux packages that only it pulls in.
  transformIgnorePatterns: [
    `node_modules/(?!(${[
      ...preset.uncompiledPackages,
      '@react-navigation',
      'react-native-screens',
      'react-redux',
      '@reduxjs/toolkit',
      'immer',
      'redux',
      'reselect',
      'redux-thunk',
    ].join('|')})/)`,
  ],
};
