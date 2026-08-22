import React from 'react';
export interface StatBarProps {
    label: string;
    value: number;
    /** Pokémon type whose colour fills the bar. */
    colourType: string;
    /**
     * Denominator for the fill fraction. A single base stat can technically reach 255 (Blissey's
     * HP), but almost nothing does, so scaling to 255 leaves every bar looking half-empty. We scale
     * to 200, a practical "elite stat" ceiling: a genuinely strong stat reads as nearly full, the
     * rare 200+ stat clamps to 100% (fair, it is maxed), and the common 40-150 range spreads across
     * a readable 20-75%.
     */
    max?: number;
    /** Row position, used to stagger the fill animation down the list. */
    index?: number;
}
export declare function StatBar({ label, value, colourType, max, index }: StatBarProps): React.JSX.Element;
//# sourceMappingURL=stat-bar.d.ts.map