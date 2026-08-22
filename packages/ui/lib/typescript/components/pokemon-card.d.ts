import React from 'react';
import { type ImageSourcePropType } from 'react-native';
export interface PokemonCardProps {
    id: number;
    name: string;
    types: string[];
    spriteUri?: string;
    spriteSource?: ImageSourcePropType;
    onPress?: () => void;
    /** When set, a remove (✕) badge is shown in the corner; tapping it runs this, not onPress. */
    onRemove?: () => void;
}
declare function PokemonCardInner({ id, name, types, spriteUri, spriteSource, onPress, onRemove, }: PokemonCardProps): React.JSX.Element;
export declare const PokemonCard: React.MemoExoticComponent<typeof PokemonCardInner>;
export {};
//# sourceMappingURL=pokemon-card.d.ts.map