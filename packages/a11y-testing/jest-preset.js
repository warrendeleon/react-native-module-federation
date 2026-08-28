// --- The shared Jest preset. Every package and every remote in the federation points its
// jest.config.js at `preset: '@pokedex/a11y-testing'`, so one file decides how accessibility
// tests run everywhere. It extends the React Native preset rather than replacing it: the smoke
// tests each app already had keep passing untouched.
//
// Two things it adds on top of the base preset:
//
//   1. `nativewind/babel` in the transform. NativeWind rewrites the JSX import source and turns
//      className into style at build time. Without this, className is an inert prop in tests and
//      every colour assertion reads undefined.
//   2. `react-native-css-interop/dist/test/setupAfterEnv.js`. This ships the toHaveStyle matcher
//      that the interop's own suite uses.
//
// Both entry points are real and shipped, and neither is documented: nativewind.dev has no
// testing section at all. They are pinned deliberately (see the versions in package.json) and
// re-checked when NativeWind moves. ---

const path = require('path');

const reactNativePreset = require('@react-native/jest-preset');

// The styling stack and the design system ship ES modules and .jsx that the base preset would
// hand to Jest untransformed. Everything listed here is transformed instead of ignored. The
// @pokedex entry covers this package and every other workspace package a suite imports.
const packagesThatShipUncompiledSource = [
  '(jest-)?react-native',
  '@react-native(-community)?',
  'nativewind',
  'react-native-css-interop',
  '@gluestack-ui',
  '@legendapp',
  '@expo/html-elements',
  'react-native-safe-area-context',
  'react-native-reanimated',
  '@pokedex',
];

module.exports = {
  ...reactNativePreset,
  // Exported so a consumer can widen the list rather than replace it. An app that also pulls in
  // React Navigation or the Redux stack spreads this array, appends its own entries and rebuilds
  // the pattern. Replacing the array outright is how a shared preset quietly stops being shared:
  // the app keeps running, and the styling stack silently drops out of the transform.
  uncompiledPackages: packagesThatShipUncompiledSource,
  setupFilesAfterEnv: [
    ...(reactNativePreset.setupFilesAfterEnv ?? []),
    require.resolve('react-native-css-interop/dist/test/setupAfterEnv.js'),
  ],
  transform: {
    // The base preset's babel transform, re-declared so nativewind/babel joins the presets.
    // .jsx is added to the pattern because gluestack-ui ships components in that extension.
    '^.+\\.(js|jsx|ts|tsx)$': [
      require.resolve('babel-jest'),
      {
        presets: [
          'module:@react-native/babel-preset',
          'nativewind/babel',
        ],
        babelrc: false,
        configFile: false,
      },
    ],
    '^.+\\.(bmp|gif|jpg|jpeg|mp4|png|psd|svg|webp)$':
      reactNativePreset.transform['^.+\\.(bmp|gif|jpg|jpeg|mp4|png|psd|svg|webp)$'],
  },
  transformIgnorePatterns: [
    `node_modules/(?!(${packagesThatShipUncompiledSource.join('|')})/)`,
  ],
  moduleNameMapper: {
    ...(reactNativePreset.moduleNameMapper ?? {}),
    // Reanimated drives animations through the JSI and a Jest process has no JSI. A consumer
    // that renders animated components points this at its own stand-in; the mapping is only
    // applied when that file exists, so packages without animation need nothing.
    ...(process.env.POKEDEX_A11Y_REANIMATED_MOCK
      ? { '^react-native-reanimated$': process.env.POKEDEX_A11Y_REANIMATED_MOCK }
      : {}),
  },
  // Suites are named *.accessibility.tsx alongside the ordinary tests, so `jest` runs both and
  // `jest accessibility` runs just this layer.
  testMatch: [
    '**/__tests__/**/*.(test|accessibility).(ts|tsx|js|jsx)',
    '**/*.(test|accessibility).(ts|tsx|js|jsx)',
  ],
  moduleDirectories: ['node_modules', path.join(__dirname, 'node_modules')],
};
