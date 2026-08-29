// --- Per-Pokémon-type colour tokens. Two consumption paths:
//
//   1. className-based (preferred). Use bgClassForType(), textOnTypeClass(), tintBgClassForType().
//      These return strings like "bg-type-fire" / "text-white" / "bg-type-fire/30". The
//      Tailwind preset (tailwind.preset.js) defines the matching colour scale.
//
//   2. Hex map (escape hatch for runtime needs that can't be expressed as classes: status
//      bar tint colour, native bridge payloads, gradient stops). Lower-cased keys match the
//      type names returned by PokéAPI so look-ups don't need transformation.
//
// Keep both in sync with tailwind.preset.js's `type` colour namespace. ---

export const TYPE_NAMES = [
  'normal',
  'fire',
  'water',
  'electric',
  'grass',
  'ice',
  'fighting',
  'poison',
  'ground',
  'flying',
  'psychic',
  'bug',
  'rock',
  'ghost',
  'dragon',
  'dark',
  'steel',
  'fairy',
] as const;

export type PokemonType = (typeof TYPE_NAMES)[number];

// --- Hex values; matches tailwind.preset.js exactly. Use only when you genuinely need a hex
// at runtime (status bar tint, native bridge payload). For rendering, use the class helpers. ---
export const typeColours: Record<string, string> = {
  normal: '#C5B1A1',
  fire: '#F78E69',
  water: '#3A86FF',
  electric: '#F7D02C',
  grass: '#A6D3A0',
  ice: '#A3D9FF',
  fighting: '#6C0E23',
  poison: '#ECB0E1',
  ground: '#E2BF65',
  flying: '#F5CAC3',
  psychic: '#E75A7C',
  bug: '#A8A77A',
  rock: '#775B59',
  ghost: '#735797',
  dragon: '#6F35FC',
  dark: '#1C2321',
  steel: '#797270',
  fairy: '#D685AD',
};

/** Fallback for unknown types; tinted neutral grey. */
export function colourForType(type: string): string {
  return typeColours[type.toLowerCase()] ?? '#9A9AB0';
}

// --- Pre-baked text-on-type colour class, so nothing runs a contrast calculation per render.
// Every entry is the higher-contrast of typeInk and white, computed from WCAG relative luminance
// rather than judged by eye: the two differ more often than they look like they should. water
// (#3A86FF) and psychic (#E75A7C) both read as "dark, saturated" and both take ink; white gives
// 3.48:1 and 3.41:1, under the 4.5:1 a badge's small text needs, where ink clears 6:1.
//
// The class is `text-typeInk`, not `text-black`. This preset defines a `black` neutral of
// #2E3138 for near-black surfaces, which shadows Tailwind's default, so `text-black` would have
// painted #2E3138 and dropped water to 3.74:1 and psychic to 3.81:1 — both failing, both green
// in any test that assumed the class meant #000000.
//
// Change a hex above and both this map and TYPE_TEXT_ON_SCRIM have to be recomputed with it. ---
const TYPE_TEXT_ON_BG: Record<string, 'text-white' | 'text-typeInk'> = {
  normal: 'text-typeInk',
  fire: 'text-typeInk',
  water: 'text-typeInk',
  electric: 'text-typeInk',
  grass: 'text-typeInk',
  ice: 'text-typeInk',
  fighting: 'text-white',
  poison: 'text-typeInk',
  ground: 'text-typeInk',
  flying: 'text-typeInk',
  psychic: 'text-typeInk',
  bug: 'text-typeInk',
  rock: 'text-white',
  ghost: 'text-white',
  dragon: 'text-white',
  dark: 'text-white',
  steel: 'text-white',
  fairy: 'text-typeInk',
};

const KNOWN = new Set<string>(TYPE_NAMES);

function normaliseType(type: string): PokemonType {
  const t = type.toLowerCase();
  return KNOWN.has(t) ? (t as PokemonType) : 'normal';
}

// --- Literal class maps, NOT template strings. Tailwind/NativeWind generate a class only when
// its full name appears verbatim in scanned source; a constructed `bg-type-${t}` is invisible to
// the scanner, so the colour silently never ships. Spelling every class out here is the standard
// Tailwind answer to dynamic class names and keeps the whole type palette in one auditable place.
const TYPE_BG_CLASS: Record<PokemonType, string> = {
  normal: 'bg-type-normal',
  fire: 'bg-type-fire',
  water: 'bg-type-water',
  electric: 'bg-type-electric',
  grass: 'bg-type-grass',
  ice: 'bg-type-ice',
  fighting: 'bg-type-fighting',
  poison: 'bg-type-poison',
  ground: 'bg-type-ground',
  flying: 'bg-type-flying',
  psychic: 'bg-type-psychic',
  bug: 'bg-type-bug',
  rock: 'bg-type-rock',
  ghost: 'bg-type-ghost',
  dragon: 'bg-type-dragon',
  dark: 'bg-type-dark',
  steel: 'bg-type-steel',
  fairy: 'bg-type-fairy',
};

const TYPE_TINT_CLASS: Record<PokemonType, string> = {
  normal: 'bg-type-normal/30',
  fire: 'bg-type-fire/30',
  water: 'bg-type-water/30',
  electric: 'bg-type-electric/30',
  grass: 'bg-type-grass/30',
  ice: 'bg-type-ice/30',
  fighting: 'bg-type-fighting/30',
  poison: 'bg-type-poison/30',
  ground: 'bg-type-ground/30',
  flying: 'bg-type-flying/30',
  psychic: 'bg-type-psychic/30',
  bug: 'bg-type-bug/30',
  rock: 'bg-type-rock/30',
  ghost: 'bg-type-ghost/30',
  dragon: 'bg-type-dragon/30',
  dark: 'bg-type-dark/30',
  steel: 'bg-type-steel/30',
  fairy: 'bg-type-fairy/30',
};

const TYPE_BORDER_CLASS: Record<PokemonType, string> = {
  normal: 'border-type-normal',
  fire: 'border-type-fire',
  water: 'border-type-water',
  electric: 'border-type-electric',
  grass: 'border-type-grass',
  ice: 'border-type-ice',
  fighting: 'border-type-fighting',
  poison: 'border-type-poison',
  ground: 'border-type-ground',
  flying: 'border-type-flying',
  psychic: 'border-type-psychic',
  bug: 'border-type-bug',
  rock: 'border-type-rock',
  ghost: 'border-type-ghost',
  dragon: 'border-type-dragon',
  dark: 'border-type-dark',
  steel: 'border-type-steel',
  fairy: 'border-type-fairy',
};

// Dark-scheme tonal chip: the type colour pulled back to a 25% wash. In dark mode a fully
// saturated pill is the brightest element on the card — brighter than the name it sits under.
// The tonal variant keeps the hue but hands the hierarchy back to the content.
const TYPE_BADGE_DARK_CLASS: Record<PokemonType, string> = {
  normal: 'dark:bg-type-normal/25',
  fire: 'dark:bg-type-fire/25',
  water: 'dark:bg-type-water/25',
  electric: 'dark:bg-type-electric/25',
  grass: 'dark:bg-type-grass/25',
  ice: 'dark:bg-type-ice/25',
  fighting: 'dark:bg-type-fighting/25',
  poison: 'dark:bg-type-poison/25',
  ground: 'dark:bg-type-ground/25',
  flying: 'dark:bg-type-flying/25',
  psychic: 'dark:bg-type-psychic/25',
  bug: 'dark:bg-type-bug/25',
  rock: 'dark:bg-type-rock/25',
  ghost: 'dark:bg-type-ghost/25',
  dragon: 'dark:bg-type-dragon/25',
  dark: 'dark:bg-type-dark/25',
  steel: 'dark:bg-type-steel/25',
  fairy: 'dark:bg-type-fairy/25',
};

/** Background class at full saturation: 'bg-type-fire'. */
export function bgClassForType(type: string): string {
  return TYPE_BG_CLASS[normaliseType(type)];
}

/** Dark-scheme tonal chip background: 'dark:bg-type-fire/25'. Pair with 'dark:text-white/90'. */
export function badgeDarkClassForType(type: string): string {
  return TYPE_BADGE_DARK_CLASS[normaliseType(type)];
}

/** Background class faded to 30% (sprite-tint pattern): 'bg-type-fire/30'. */
export function tintBgClassForType(type: string): string {
  return TYPE_TINT_CLASS[normaliseType(type)];
}

/** Foreground text class chosen for contrast against bgClassForType. */
export function textOnTypeClass(type: string): 'text-white' | 'text-typeInk' {
  return TYPE_TEXT_ON_BG[normaliseType(type)];
}

// --- The same decision for the hero badge, whose surface is not the type colour.
//
// TypeBadge's hero variant lays a 30% white scrim over the hero so the pill reads against a
// background that is already the type colour. That scrim lightens what sits behind the text, so
// the foreground chosen for the solid fill is the wrong one for four types: rock, ghost, dragon
// and steel take white on the fill and would land at 3.17:1, 3.14:1, 3.39:1 and 2.71:1 on the
// scrim. Computed against the composite (0.3 white over the fill) instead, every type clears
// 4.5:1, the lowest being fighting at 5.45:1.
//
// Recompute this map alongside TYPE_TEXT_ON_BG whenever a type hex or the scrim alpha moves. ---
const TYPE_TEXT_ON_SCRIM: Record<PokemonType, 'text-white' | 'text-typeInk'> = {
  normal: 'text-typeInk',
  fire: 'text-typeInk',
  water: 'text-typeInk',
  electric: 'text-typeInk',
  grass: 'text-typeInk',
  ice: 'text-typeInk',
  fighting: 'text-white',
  poison: 'text-typeInk',
  ground: 'text-typeInk',
  flying: 'text-typeInk',
  psychic: 'text-typeInk',
  bug: 'text-typeInk',
  rock: 'text-typeInk',
  ghost: 'text-typeInk',
  dragon: 'text-typeInk',
  dark: 'text-white',
  steel: 'text-typeInk',
  fairy: 'text-typeInk',
};

/** Foreground text class for a badge sitting on the hero's translucent scrim. */
export function textOnHeroScrimClass(type: string): 'text-white' | 'text-typeInk' {
  return TYPE_TEXT_ON_SCRIM[normaliseType(type)];
}

/** The scrim alpha TypeBadge's hero variant paints, exported so tests composite the same value. */
export const HERO_SCRIM_ALPHA = 0.3;

/** Border class at full saturation (accent rules, quote cards): 'border-type-fire'. */
export function borderClassForType(type: string): string {
  return TYPE_BORDER_CLASS[normaliseType(type)];
}
