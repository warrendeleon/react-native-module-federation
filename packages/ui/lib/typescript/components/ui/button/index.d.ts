import React from 'react';
import { type VariantProps } from '@gluestack-ui/utils/nativewind-utils';
import { View } from 'react-native';
declare const UIButton: import("@gluestack-ui/core/lib/esm/button/creator/types").IButtonComponentType<Omit<import("react-native").PressableProps & React.RefAttributes<View>, "ref"> & {
    context?: any;
} & React.RefAttributes<React.ForwardRefExoticComponent<import("react-native").PressableProps & React.RefAttributes<View>>>, import("react-native").ViewProps, import("react-native").ActivityIndicatorProps, import("react-native").TextProps, import("@gluestack-ui/core/lib/esm/icon/creator/createIcon").IIconProps & (((import("@gluestack-ui/core/icon/creator").IPrimitiveIcon & React.RefAttributes<import("@gluestack-ui/core/icon/creator").Svg>) | {
    fill?: import("react-native").ColorValue;
    stroke?: import("react-native").ColorValue;
}) & React.RefAttributes<(import("@gluestack-ui/core/icon/creator").IPrimitiveIcon & React.RefAttributes<import("@gluestack-ui/core/icon/creator").Svg>) | {
    fill?: import("react-native").ColorValue;
    stroke?: import("react-native").ColorValue;
}>)>;
declare const buttonIconStyle: import("@gluestack-ui/utils/nativewind-utils").TVReturnType<({} | {} | {}) & {
    variant: {
        link: string;
        outline: string;
        solid: string;
    };
    size: {
        xs: string;
        sm: string;
        md: string;
        lg: string;
        xl: string;
    };
    action: {
        primary: string;
        secondary: string;
        positive: string;
        negative: string;
    };
}, undefined, "fill-none", import("tailwind-variants/dist/config").TVConfig<unknown, {} | {}>, {} | {}, undefined, import("@gluestack-ui/utils/nativewind-utils").TVReturnType<unknown, undefined, "fill-none", import("tailwind-variants/dist/config").TVConfig<unknown, {} | {}>, unknown, unknown, undefined>>;
declare const Button: React.ForwardRefExoticComponent<Omit<Omit<Omit<Omit<import("react-native").PressableProps & React.RefAttributes<View>, "ref"> & {
    context?: any;
} & React.RefAttributes<React.ForwardRefExoticComponent<import("react-native").PressableProps & React.RefAttributes<View>>> & import("@gluestack-ui/core/lib/esm/button/creator/types").InterfaceButtonProps, "ref"> & React.RefAttributes<Omit<import("react-native").PressableProps & React.RefAttributes<View>, "ref"> & {
    context?: any;
} & React.RefAttributes<React.ForwardRefExoticComponent<import("react-native").PressableProps & React.RefAttributes<View>>>>, "ref">, "context"> & VariantProps<import("@gluestack-ui/utils/nativewind-utils").TVReturnType<{
    action: {
        primary: string;
        secondary: string;
        positive: string;
        negative: string;
        default: string;
    };
    variant: {
        link: string;
        outline: string;
        solid: string;
    };
    size: {
        xs: string;
        sm: string;
        md: string;
        lg: string;
        xl: string;
    };
} | ({
    action: {
        primary: string;
        secondary: string;
        positive: string;
        negative: string;
        default: string;
    };
    variant: {
        link: string;
        outline: string;
        solid: string;
    };
    size: {
        xs: string;
        sm: string;
        md: string;
        lg: string;
        xl: string;
    };
} & {
    action: {
        primary: import("tailwind-merge").ClassNameValue | {
            base?: import("tailwind-merge").ClassNameValue;
        };
        secondary: import("tailwind-merge").ClassNameValue | {
            base?: import("tailwind-merge").ClassNameValue;
        };
        positive: import("tailwind-merge").ClassNameValue | {
            base?: import("tailwind-merge").ClassNameValue;
        };
        negative: import("tailwind-merge").ClassNameValue | {
            base?: import("tailwind-merge").ClassNameValue;
        };
        default: import("tailwind-merge").ClassNameValue | {
            base?: import("tailwind-merge").ClassNameValue;
        };
    };
    variant: {
        link: import("tailwind-merge").ClassNameValue | {
            base?: import("tailwind-merge").ClassNameValue;
        };
        outline: import("tailwind-merge").ClassNameValue | {
            base?: import("tailwind-merge").ClassNameValue;
        };
        solid: import("tailwind-merge").ClassNameValue | {
            base?: import("tailwind-merge").ClassNameValue;
        };
    };
    size: {
        xs: import("tailwind-merge").ClassNameValue | {
            base?: import("tailwind-merge").ClassNameValue;
        };
        sm: import("tailwind-merge").ClassNameValue | {
            base?: import("tailwind-merge").ClassNameValue;
        };
        md: import("tailwind-merge").ClassNameValue | {
            base?: import("tailwind-merge").ClassNameValue;
        };
        lg: import("tailwind-merge").ClassNameValue | {
            base?: import("tailwind-merge").ClassNameValue;
        };
        xl: import("tailwind-merge").ClassNameValue | {
            base?: import("tailwind-merge").ClassNameValue;
        };
    };
}), undefined, "group/button rounded bg-primary-500 flex-row items-center justify-center data-[focus-visible=true]:web:outline-none data-[focus-visible=true]:web:ring-2 data-[disabled=true]:opacity-40 gap-2", import("tailwind-variants/dist/config").TVConfig<{
    action: {
        primary: string;
        secondary: string;
        positive: string;
        negative: string;
        default: string;
    };
    variant: {
        link: string;
        outline: string;
        solid: string;
    };
    size: {
        xs: string;
        sm: string;
        md: string;
        lg: string;
        xl: string;
    };
}, {
    action: {
        primary: string;
        secondary: string;
        positive: string;
        negative: string;
        default: string;
    };
    variant: {
        link: string;
        outline: string;
        solid: string;
    };
    size: {
        xs: string;
        sm: string;
        md: string;
        lg: string;
        xl: string;
    };
}>, {
    action: {
        primary: string;
        secondary: string;
        positive: string;
        negative: string;
        default: string;
    };
    variant: {
        link: string;
        outline: string;
        solid: string;
    };
    size: {
        xs: string;
        sm: string;
        md: string;
        lg: string;
        xl: string;
    };
}, undefined, import("@gluestack-ui/utils/nativewind-utils").TVReturnType<{
    action: {
        primary: string;
        secondary: string;
        positive: string;
        negative: string;
        default: string;
    };
    variant: {
        link: string;
        outline: string;
        solid: string;
    };
    size: {
        xs: string;
        sm: string;
        md: string;
        lg: string;
        xl: string;
    };
}, undefined, "group/button rounded bg-primary-500 flex-row items-center justify-center data-[focus-visible=true]:web:outline-none data-[focus-visible=true]:web:ring-2 data-[disabled=true]:opacity-40 gap-2", import("tailwind-variants/dist/config").TVConfig<{
    action: {
        primary: string;
        secondary: string;
        positive: string;
        negative: string;
        default: string;
    };
    variant: {
        link: string;
        outline: string;
        solid: string;
    };
    size: {
        xs: string;
        sm: string;
        md: string;
        lg: string;
        xl: string;
    };
}, {
    action: {
        primary: string;
        secondary: string;
        positive: string;
        negative: string;
        default: string;
    };
    variant: {
        link: string;
        outline: string;
        solid: string;
    };
    size: {
        xs: string;
        sm: string;
        md: string;
        lg: string;
        xl: string;
    };
}>, unknown, unknown, undefined>>> & {
    className?: string;
} & React.RefAttributes<Omit<import("react-native").PressableProps & React.RefAttributes<View>, "ref"> & {
    context?: any;
} & React.RefAttributes<React.ForwardRefExoticComponent<import("react-native").PressableProps & React.RefAttributes<View>>>>>;
declare const ButtonText: React.ForwardRefExoticComponent<Omit<React.RefAttributes<import("react-native").TextProps> & import("react-native").TextProps, "ref"> & VariantProps<import("@gluestack-ui/utils/nativewind-utils").TVReturnType<({} | {} | {}) & {
    action: {
        primary: string;
        secondary: string;
        positive: string;
        negative: string;
    };
    variant: {
        link: string;
        outline: string;
        solid: string;
    };
    size: {
        xs: string;
        sm: string;
        md: string;
        lg: string;
        xl: string;
    };
}, undefined, "text-typography-0 font-semibold web:select-none", import("tailwind-variants/dist/config").TVConfig<unknown, {} | {}>, {} | {}, undefined, import("@gluestack-ui/utils/nativewind-utils").TVReturnType<unknown, undefined, "text-typography-0 font-semibold web:select-none", import("tailwind-variants/dist/config").TVConfig<unknown, {} | {}>, unknown, unknown, undefined>>> & {
    className?: string;
} & React.RefAttributes<import("react-native").TextProps>>;
declare const ButtonSpinner: React.ForwardRefExoticComponent<import("react-native").ActivityIndicatorProps & React.RefAttributes<import("react-native").ActivityIndicatorProps>>;
type IButtonIcon = React.ComponentPropsWithoutRef<typeof UIButton.Icon> & VariantProps<typeof buttonIconStyle> & {
    className?: string | undefined;
    as?: React.ElementType;
    height?: number;
    width?: number;
};
declare const ButtonIcon: React.ForwardRefExoticComponent<IButtonIcon & React.RefAttributes<(import("@gluestack-ui/core/lib/esm/icon/creator/createIcon").IIconProps & import("@gluestack-ui/core/icon/creator").IPrimitiveIcon & React.RefAttributes<import("@gluestack-ui/core/icon/creator").Svg> & React.RefAttributes<(import("@gluestack-ui/core/icon/creator").IPrimitiveIcon & React.RefAttributes<import("@gluestack-ui/core/icon/creator").Svg>) | {
    fill?: import("react-native").ColorValue;
    stroke?: import("react-native").ColorValue;
}>) | (import("@gluestack-ui/core/lib/esm/icon/creator/createIcon").IIconProps & {
    fill?: import("react-native").ColorValue;
    stroke?: import("react-native").ColorValue;
} & React.RefAttributes<(import("@gluestack-ui/core/icon/creator").IPrimitiveIcon & React.RefAttributes<import("@gluestack-ui/core/icon/creator").Svg>) | {
    fill?: import("react-native").ColorValue;
    stroke?: import("react-native").ColorValue;
}>)>>;
declare const ButtonGroup: React.ForwardRefExoticComponent<Omit<React.RefAttributes<import("react-native").ViewProps> & import("react-native").ViewProps & import("@gluestack-ui/core/lib/esm/button/creator/types").IButtonGroupProps, "ref"> & VariantProps<import("@gluestack-ui/utils/nativewind-utils").TVReturnType<{
    space: {
        xs: string;
        sm: string;
        md: string;
        lg: string;
        xl: string;
        '2xl': string;
        '3xl': string;
        '4xl': string;
    };
    isAttached: {
        true: string;
    };
    flexDirection: {
        row: string;
        column: string;
        'row-reverse': string;
        'column-reverse': string;
    };
} | ({
    space: {
        xs: string;
        sm: string;
        md: string;
        lg: string;
        xl: string;
        '2xl': string;
        '3xl': string;
        '4xl': string;
    };
    isAttached: {
        true: string;
    };
    flexDirection: {
        row: string;
        column: string;
        'row-reverse': string;
        'column-reverse': string;
    };
} & {
    space: {
        xs: import("tailwind-merge").ClassNameValue | {
            base?: import("tailwind-merge").ClassNameValue;
        };
        sm: import("tailwind-merge").ClassNameValue | {
            base?: import("tailwind-merge").ClassNameValue;
        };
        md: import("tailwind-merge").ClassNameValue | {
            base?: import("tailwind-merge").ClassNameValue;
        };
        lg: import("tailwind-merge").ClassNameValue | {
            base?: import("tailwind-merge").ClassNameValue;
        };
        xl: import("tailwind-merge").ClassNameValue | {
            base?: import("tailwind-merge").ClassNameValue;
        };
        '2xl': import("tailwind-merge").ClassNameValue | {
            base?: import("tailwind-merge").ClassNameValue;
        };
        '3xl': import("tailwind-merge").ClassNameValue | {
            base?: import("tailwind-merge").ClassNameValue;
        };
        '4xl': import("tailwind-merge").ClassNameValue | {
            base?: import("tailwind-merge").ClassNameValue;
        };
    };
    isAttached: {
        true: import("tailwind-merge").ClassNameValue | {
            base?: import("tailwind-merge").ClassNameValue;
        };
    };
    flexDirection: {
        row: import("tailwind-merge").ClassNameValue | {
            base?: import("tailwind-merge").ClassNameValue;
        };
        column: import("tailwind-merge").ClassNameValue | {
            base?: import("tailwind-merge").ClassNameValue;
        };
        'row-reverse': import("tailwind-merge").ClassNameValue | {
            base?: import("tailwind-merge").ClassNameValue;
        };
        'column-reverse': import("tailwind-merge").ClassNameValue | {
            base?: import("tailwind-merge").ClassNameValue;
        };
    };
}), undefined, "", import("tailwind-variants/dist/config").TVConfig<{
    space: {
        xs: string;
        sm: string;
        md: string;
        lg: string;
        xl: string;
        '2xl': string;
        '3xl': string;
        '4xl': string;
    };
    isAttached: {
        true: string;
    };
    flexDirection: {
        row: string;
        column: string;
        'row-reverse': string;
        'column-reverse': string;
    };
}, {
    space: {
        xs: string;
        sm: string;
        md: string;
        lg: string;
        xl: string;
        '2xl': string;
        '3xl': string;
        '4xl': string;
    };
    isAttached: {
        true: string;
    };
    flexDirection: {
        row: string;
        column: string;
        'row-reverse': string;
        'column-reverse': string;
    };
}>, {
    space: {
        xs: string;
        sm: string;
        md: string;
        lg: string;
        xl: string;
        '2xl': string;
        '3xl': string;
        '4xl': string;
    };
    isAttached: {
        true: string;
    };
    flexDirection: {
        row: string;
        column: string;
        'row-reverse': string;
        'column-reverse': string;
    };
}, undefined, import("@gluestack-ui/utils/nativewind-utils").TVReturnType<{
    space: {
        xs: string;
        sm: string;
        md: string;
        lg: string;
        xl: string;
        '2xl': string;
        '3xl': string;
        '4xl': string;
    };
    isAttached: {
        true: string;
    };
    flexDirection: {
        row: string;
        column: string;
        'row-reverse': string;
        'column-reverse': string;
    };
}, undefined, "", import("tailwind-variants/dist/config").TVConfig<{
    space: {
        xs: string;
        sm: string;
        md: string;
        lg: string;
        xl: string;
        '2xl': string;
        '3xl': string;
        '4xl': string;
    };
    isAttached: {
        true: string;
    };
    flexDirection: {
        row: string;
        column: string;
        'row-reverse': string;
        'column-reverse': string;
    };
}, {
    space: {
        xs: string;
        sm: string;
        md: string;
        lg: string;
        xl: string;
        '2xl': string;
        '3xl': string;
        '4xl': string;
    };
    isAttached: {
        true: string;
    };
    flexDirection: {
        row: string;
        column: string;
        'row-reverse': string;
        'column-reverse': string;
    };
}>, unknown, unknown, undefined>>> & React.RefAttributes<import("react-native").ViewProps>>;
export { Button, ButtonText, ButtonSpinner, ButtonIcon, ButtonGroup };
//# sourceMappingURL=index.d.ts.map