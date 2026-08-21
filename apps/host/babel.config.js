module.exports = {
  presets: ['module:@react-native/babel-preset'],
  // NativeWind's JSX runtime. The repack-plugin-nativewind covers the bundler side of the
  // className transform; the automatic-runtime importSource is still needed so JSX compiles
  // against nativewind's jsx-runtime.
  plugins: [
    ['@babel/plugin-transform-react-jsx', { runtime: 'automatic', importSource: 'nativewind' }],
  ],
  env: {
    test: {
      // Jest runs on Node's CommonJS pipeline, where a native dynamic import() dies with
      // ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING_FLAG before Jest's resolver ever sees the
      // specifier. Lowering import() to require under test routes the federated
      // partyApp/partySlice specifier through moduleNameMapper and into its mock.
      plugins: ['@babel/plugin-transform-dynamic-import'],
    },
  },
};
