"use strict";

import React, { useEffect } from 'react';
import { config } from "./config.js";
import { View } from 'react-native';
import { OverlayProvider } from '@gluestack-ui/core/overlay/creator';
import { ToastProvider } from '@gluestack-ui/core/toast/creator';
import { useColorScheme } from 'nativewind';
import { jsx as _jsx } from "react/jsx-runtime";
export function GluestackUIProvider({
  mode = 'light',
  ...props
}) {
  const {
    colorScheme,
    setColorScheme
  } = useColorScheme();
  useEffect(() => {
    setColorScheme(mode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);
  return /*#__PURE__*/_jsx(View, {
    style: [config[colorScheme], {
      flex: 1,
      height: '100%',
      width: '100%'
    }, props.style],
    children: /*#__PURE__*/_jsx(OverlayProvider, {
      children: /*#__PURE__*/_jsx(ToastProvider, {
        children: props.children
      })
    })
  });
}
//# sourceMappingURL=index.js.map