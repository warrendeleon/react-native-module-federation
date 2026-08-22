// Point the React Native CLI at Re.Pack, so `react-native start` and `react-native bundle`
// use Rspack (via rspack.config.mjs) instead of Metro.
module.exports = {
  commands: require('@callstack/repack/commands/rspack'),
  // The display typeface ships in each app binary; fonts are native assets, so a remote can
  // use the family only because the host binary embeds it.
  assets: ['../../assets/fonts'],
};
