// Tailwind config for this remote. Same preset as the host so every token class resolves to the
// same value on both sides of the seam. `content` scans this app's source plus the shipped source
// of BOTH packages it composes: @pokedex/ui and @pokedex/detail carry className strings this
// app's build must see, or the classes unique to them silently never generate.
const path = require('path');

/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [require('nativewind/preset'), require('@pokedex/ui/tailwind.preset.js')],
  darkMode: 'class',
  content: [
    './App.tsx',
    './src/**/*.{js,jsx,ts,tsx}',
    path.join(path.dirname(require.resolve('@pokedex/ui/package.json')), 'src/**/*.{js,jsx,ts,tsx}'),
    path.join(path.dirname(require.resolve('@pokedex/detail/package.json')), 'src/**/*.{js,jsx,ts,tsx}'),
  ],
  theme: { extend: {} },
  plugins: [],
};
