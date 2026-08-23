import React from 'react';
export interface StatBarProps {
    label: string;
    value: number;
    /** Pokémon type whose colour fills the bar. */
    colourType: string;
    /**
     * Denominator for the fill fraction. A single base stat can technically reach 255, but almost
     * nothing does, so a 255 ceiling leaves every bar looking half-empty and alike. 160 is the
     * practical "elite stat" ceiling: the common 40-120 range spreads across a readable 25-75%,
     * and the rare 160+ stat clamps to full. A hairline tick marks 100, the round-number reference
     * readers compare against.
     */
    max?: number;
    /** Row position, used to stagger the fill animation down the list. */
    index?: number;
}
export declare function StatBar({ label, value, colourType, max, index }: StatBarProps): React.JSX.Element;
//# sourceMappingURL=stat-bar.d.ts.map