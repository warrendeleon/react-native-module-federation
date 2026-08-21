import React from 'react';
export interface ErrorStateProps {
    title?: string;
    message?: string;
    onRetry?: () => void;
    retryLabel?: string;
    variant?: 'light' | 'dark';
}
export declare function ErrorState({ title, message, onRetry, retryLabel, variant, }: ErrorStateProps): React.JSX.Element;
//# sourceMappingURL=error-state.d.ts.map