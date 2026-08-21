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
export declare function PokemonCard({ id, name, types, spriteUri, spriteSource, onPress, onRemove, }: PokemonCardProps): React.JSX.Element;
//# sourceMappingURL=pokemon-card.d.ts.map