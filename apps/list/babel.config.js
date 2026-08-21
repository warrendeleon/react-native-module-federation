module.exports = {
  presets: ['module:@react-native/babel-preset'],
  // NativeWind's JSX runtime. The repack-plugin-nativewind covers the bundler side of the
  // className transform; the automatic-runtime importSource is still needed so JSX compiles
  // against nativewind's jsx-runtime.
  plugins: [
    ['@babel/plugin-transform-react-jsx', { runtime: 'automatic', importSource: 'nativewind' }],
  ],
};
