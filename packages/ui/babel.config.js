// --- Babel config used by react-native-builder-bob when it transpiles src/ into the shipped
// lib/ outputs. Matches what the Re.Pack-bundled consumer apps run: TypeScript stripped, JSX
// through the automatic runtime, NativeWind className handling attached via cssInterop. ---

module.exports = {
  presets: [['module:@react-native/babel-preset', { disableImportExportTransform: false }]],
  // nativewind/babel is the className plugin; it must come after the RN preset so the JSX is
  // already in a shape the plugin can rewrite.
  plugins: ['nativewind/babel'],
};
