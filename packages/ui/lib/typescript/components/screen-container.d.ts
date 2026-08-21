import React from 'react';
type Variant = 'light' | 'dark';
type EdgesProp = ('top' | 'bottom' | 'left' | 'right')[];
export interface ScreenContainerProps {
    variant?: Variant;
    edges?: EdgesProp;
    className?: string;
    children?: React.ReactNode;
}
export declare function ScreenContainer({ variant, edges, className, children, }: ScreenContainerProps): React.JSX.Element;
export {};
//# sourceMappingURL=screen-container.d.ts.map