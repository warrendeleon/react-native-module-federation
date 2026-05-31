// Point the React Native CLI at Re.Pack, so `react-native start` and `react-native bundle`
// use Rspack (via rspack.config.mjs) instead of Metro.
module.exports = {
  commands: require('@callstack/repack/commands/rspack'),
};
