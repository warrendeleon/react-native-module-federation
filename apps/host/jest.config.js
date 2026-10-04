const preset = require('@react-native/jest-preset');

module.exports = {
  preset: '@react-native/jest-preset',
  // Reanimated drives animations through the JSI (the JavaScript Interface React Native uses to
  // call native code), which a Jest process has no runtime for, so it is replaced by the stand-in
  // in __mocks__. One entry covers the whole federation: @pokedex/ui and @pokedex/detail import
  // the same module specifier, so their animated components resolve to the same mock.
  // The Re.Pack client and Module Federation runtime entries exist because Re.Pack's ScriptManager
  // and Module Federation's registerRemotes both reach into a bundler runtime that a Jest process
  // does not have, and the host touches both at module scope, so the resolver is in place before
  // any federated load can fire. Their stand-ins record what was asked of them. The runtime's
  // stand-in also serves the two modules the host loads from partyApp at boot, from __mocks__: the
  // state module's mock repeats the real module's side effect (reducer injection), so boot
  // readiness is testable. The Nitro entry exists because the host's storage, react-native-mmkv,
  // imports Nitro, and Nitro looks up its native module as it loads: MMKV keeps its values in
  // memory under Jest, but only once the import has got past that lookup.
  moduleNameMapper: {
    '^react-native-reanimated$': '<rootDir>/__mocks__/react-native-reanimated.js',
    '^@callstack/repack/client$': '<rootDir>/__mocks__/repack-client.js',
    '^@module-federation/runtime$': '<rootDir>/__mocks__/module-federation-runtime.js',
    '^react-native-nitro-modules$': '<rootDir>/__mocks__/react-native-nitro-modules.js',
  },
  // @gluestack-ui/utils ships .jsx files, and the base preset's transform pattern covers
  // (js|ts|tsx) only, so they would reach Jest untransformed and throw on their import
  // statements. Same transformer, one extension wider.
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': preset.transform['^.+\\.(js|ts|tsx)$'],
    '^.+\\.(bmp|gif|jpg|jpeg|mp4|png|psd|svg|webp)$':
      preset.transform['^.+\\.(bmp|gif|jpg|jpeg|mp4|png|psd|svg|webp)$'],
  },
  // Some packages reach Jest as code it cannot run untransformed. @react-navigation ships only ES
  // modules. react-redux and immer ship CommonJS as well, but React Native's Jest environment
  // resolves packages with the "react-native" export condition, and both point that condition at an
  // ES module build. The base preset only sends React Native's own packages through Babel: its
  // transformIgnorePatterns lists react-native, jest-react-native, @react-native and
  // @react-native-community, and nothing else. Add these too, or every test file that imports one
  // fails before its tests run. @pokedex/ui joins them because its main entry is an ES module
  // build. So do four packages it pulls in: @gluestack-ui/core and @gluestack-ui/utils ship ES
  // modules, @expo/html-elements ships its TypeScript source, and react-native-css-interop ships
  // JSX in a .js file. @noble/ed25519 and @noble/hashes, which verify the version map, ship ES
  // modules only, and so does react-native-mmkv, the host's storage.
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|@react-navigation|react-redux|immer|@pokedex/ui|react-native-css-interop|@gluestack-ui|@expo/html-elements|@noble|react-native-mmkv)/)',
  ],
};
