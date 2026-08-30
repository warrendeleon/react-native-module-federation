export declare const TYPE_NAMES: readonly ["normal", "fire", "water", "electric", "grass", "ice", "fighting", "poison", "ground", "flying", "psychic", "bug", "rock", "ghost", "dragon", "dark", "steel", "fairy"];
export type PokemonType = (typeof TYPE_NAMES)[number];
export declare const typeColours: Record<string, string>;
/** Fallback for unknown types; tinted neutral grey. */
export declare function colourForType(type: string): string;
/** Background class at full saturation: 'bg-type-fire'. */
export declare function bgClassForType(type: string): string;
/** Dark-scheme tonal chip background: 'dark:bg-type-fire/25'. Pair with 'dark:text-white/90'. */
export declare function badgeDarkClassForType(type: string): string;
/** Background class faded to 30% (sprite-tint pattern): 'bg-type-fire/30'. */
export declare function tintBgClassForType(type: string): string;
/** Foreground text class chosen for contrast against bgClassForType. */
export declare function textOnTypeClass(type: string): 'text-white' | 'text-typeInk';
/** Foreground text class for a badge sitting on the hero's translucent scrim. */
export declare function textOnHeroScrimClass(type: string): 'text-white' | 'text-typeInk';
/** The scrim alpha TypeBadge's hero variant paints, exported so tests composite the same value. */
export declare const HERO_SCRIM_ALPHA = 0.3;
/**
 * The class that paints it. Tailwind only generates a class it sees written out, so this is a
 * literal rather than a template built from the alpha above — but it lives here, beside the
 * number the contrast map was computed against, and TypeBadge imports it rather than spelling
 * `bg-white/30` again. Two copies of the same 0.3 in two files is how the component and the
 * map drift apart without any test noticing.
 */
export declare const HERO_SCRIM_CLASS = "bg-white/30";
/**
 * The floating back pill's dark scrim, in the same shape and for the same reason as the hero's.
 *
 * The alpha is the number the contrast map composites; the class is the literal Tailwind sees.
 * It paints `typeInk`, not `black`: the preset's `black` is the #2E3138 near-black surface, and
 * at 35% over the palest fills that put the white chevron at 2.81:1 on flying, 2.83 on ice and
 * 2.84 on electric — under the 3:1 SC 1.4.11 asks of a control's own boundary. Real black at the
 * same alpha clears every fill, worst case 3.48 on flying. The same token shadowing that the
 * badge foreground hit, one layer down, on a background rather than a foreground.
 */
export declare const BACK_PILL_SCRIM_ALPHA = 0.35;
export declare const BACK_PILL_SCRIM_CLASS = "bg-typeInk/35";
/** Border class at full saturation (accent rules, quote cards): 'border-type-fire'. */
export declare function borderClassForType(type: string): string;
//# sourceMappingURL=typeColours.d.ts.map