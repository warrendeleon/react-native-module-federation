import React from 'react';
export interface InfoRowProps {
    label: string;
    value: string;
    /** Set on the last row of a section card so it does not draw a rule against the card edge. */
    last?: boolean;
}
export declare function InfoRow({ label, value, last }: InfoRowProps): React.JSX.Element;
//# sourceMappingURL=info-row.d.ts.map