// --- Pokédex colour palette. Used by both the Tailwind preset (so className="bg-pokemonGreen"
// resolves) and runtime code that needs the hex value directly (status bar tint, gradient
// stops, native side). Single source of truth for both consumption paths. ---

export const colours = {
  // --- Brand + accent ---
  blue: '#3A86FF',
  // The brand blue is a fill and a large-text colour: on white it is 3.48:1 and on the near-black
  // surface 3.74:1, both under the 4.5:1 small text needs. The tab bar's active label is 10pt, so
  // it takes a readable pair instead — one per surface, because no single blue clears both.
  blueText: '#2065E0',
  blueTextDark: '#79AEFF',
  purple: '#8338EC',
  red: '#C92016',
  pokemonGreen: '#9BE89B',
  lightGreen: '#D1FFD7',
  darkGreen: '#A6D3A0',

  // --- Neutrals (light theme) ---
  white: '#FFFFFF',
  offWhite: '#F7F8FC',
  offGrey: '#F0F2F5',
  lightGrey: '#DBDCE6',
  midGrey: '#9A9AB0',
  darkGrey: '#515151',

  // --- Neutrals (dark theme; Party tab uses these) ---
  navy: '#0F172A',
  black: '#2E3138',

  // --- Foreground ink for type-coloured surfaces. Real black, unlike the `black` neutral
  // above: see the note in tailwind.preset.js. ---
  typeInk: '#000000',
  // The background half of the same fact: the preset's `black` is #2E3138, so a scrim that
  // needs real black asks for it by name rather than borrowing the badge's foreground token.
  scrim: '#000000',
} as const;

export type ColourToken = keyof typeof colours;
