import React from 'react';
export interface TypeBadgeProps {
    type: string;
    size?: 'xs' | 'sm' | 'md';
    /**
     * Where the badge sits. On a card it fills with the type colour. On a hero whose background
     * IS the type colour, a solid pill of the same colour would vanish; the hero variant uses a
     * translucent scrim instead, so the pill reads on any type.
     */
    surface?: 'card' | 'hero';
}
export declare function TypeBadge({ type, size, surface }: TypeBadgeProps): React.JSX.Element;
//# sourceMappingURL=type-badge.d.ts.map