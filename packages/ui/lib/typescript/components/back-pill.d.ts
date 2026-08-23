import React from 'react';
import { type StyleProp, type ViewStyle } from 'react-native';
export interface BackPillProps {
    onPress: () => void;
    /** Defaults to "Go back". */
    accessibilityLabel?: string;
    style?: StyleProp<ViewStyle>;
}
export declare function BackPill({ onPress, accessibilityLabel, style }: BackPillProps): React.JSX.Element;
//# sourceMappingURL=back-pill.d.ts.map