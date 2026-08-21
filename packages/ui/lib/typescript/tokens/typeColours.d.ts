export declare const TYPE_NAMES: readonly ["normal", "fire", "water", "electric", "grass", "ice", "fighting", "poison", "ground", "flying", "psychic", "bug", "rock", "ghost", "dragon", "dark", "steel", "fairy"];
export type PokemonType = (typeof TYPE_NAMES)[number];
export declare const typeColours: Record<string, string>;
/** Fallback for unknown types; tinted neutral grey. */
export declare function colourForType(type: string): string;
/** Background class at full saturation: 'bg-type-fire'. */
export declare function bgClassForType(type: string): string;
/** Background class faded to 30% (sprite-tint pattern): 'bg-type-fire/30'. */
export declare function tintBgClassForType(type: string): string;
/** Foreground text class chosen for contrast against bgClassForType: 'text-white' or 'text-black'. */
export declare function textOnTypeClass(type: string): 'text-white' | 'text-black';
//# sourceMappingURL=typeColours.d.ts.map