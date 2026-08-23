import React from 'react';
export interface ToastOptions {
    /** Sprite shown in a type-tinted disc at the capsule's leading edge. */
    spriteUri?: string;
    /** Type name driving the disc's tint; ignored without a spriteUri. */
    accentType?: string;
}
/** Show a transient confirmation. Safe to call from any module; no-op until a Toaster mounts. */
export declare function toast(message: string, options?: ToastOptions): void;
export interface ToasterProps {
    /** Distance from the bottom edge, so the host can clear its tab bar. */
    bottomOffset?: number;
}
export declare function Toaster({ bottomOffset }: ToasterProps): React.JSX.Element | null;
//# sourceMappingURL=toast.d.ts.map