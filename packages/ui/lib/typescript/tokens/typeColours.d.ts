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
/** Border class at full saturation (accent rules, quote cards): 'border-type-fire'. */
export declare function borderClassForType(type: string): string;
//# sourceMappingURL=typeColours.d.ts.map