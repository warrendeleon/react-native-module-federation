// Tailwind config for the host. The @pokedex/ui preset carries the shared colour tokens and the
// per-type namespace, so className="bg-pokemonGreen" or "bg-type-fire" resolves here exactly as
// it does in any remote. `content` scans the host's own source AND the design system's shipped
// source: classes that appear only inside the library would otherwise never generate, and the
// breakage looks intermittent because a class the app also uses still works.
const path = require('path');

/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [require('nativewind/preset'), require('@pokedex/ui/tailwind.preset.js')],
  darkMode: 'class',
  content: [
    './App.tsx',
    './src/**/*.{js,jsx,ts,tsx}',
    path.join(path.dirname(require.resolve('@pokedex/ui/package.json')), 'src/**/*.{js,jsx,ts,tsx}'),
  ],
  theme: { extend: {} },
  plugins: [],
};
