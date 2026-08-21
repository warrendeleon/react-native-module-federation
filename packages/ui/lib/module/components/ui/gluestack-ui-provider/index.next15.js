"use strict";
// This is a Next.js 15 compatible version of the GluestackUIProvider
'use client';

import React, { useEffect, useLayoutEffect } from 'react';
import { config } from "./config.js";
import { OverlayProvider } from '@gluestack-ui/core/overlay/creator';
import { ToastProvider } from '@gluestack-ui/core/toast/creator';
import { setFlushStyles } from '@gluestack-ui/utils/nativewind-utils';
import { script } from "./script.js";
import { jsx as _jsx } from "react/jsx-runtime";
const variableStyleTagId = 'nativewind-style';
const createStyle = styleTagId => {
  const style = document.createElement('style');
  style.id = styleTagId;
  style.appendChild(document.createTextNode(''));
  return style;
};
export const useSafeLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;
export function GluestackUIProvider({
  mode = 'light',
  ...props
}) {
  let cssVariablesWithMode = ``;
  Object.keys(config).forEach(configKey => {
    cssVariablesWithMode += configKey === 'dark' ? `\n .dark {\n ` : `\n:root {\n`;
    const cssVariables = Object.keys(config[configKey]).reduce((acc, curr) => {
      acc += `${curr}:${config[configKey][curr]}; `;
      return acc;
    }, '');
    cssVariablesWithMode += `${cssVariables} \n}`;
  });
  setFlushStyles(cssVariablesWithMode);
  const handleMediaQuery = React.useCallback(e => {
    script(e.matches ? 'dark' : 'light');
  }, []);
  useSafeLayoutEffect(() => {
    if (mode !== 'system') {
      const documentElement = document.documentElement;
      if (documentElement) {
        documentElement.classList.add(mode);
        documentElement.classList.remove(mode === 'light' ? 'dark' : 'light');
        documentElement.style.colorScheme = mode;
      }
    }
  }, [mode]);
  useSafeLayoutEffect(() => {
    if (mode !== 'system') return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    media.addListener(handleMediaQuery);
    return () => media.removeListener(handleMediaQuery);
  }, [handleMediaQuery]);
  useSafeLayoutEffect(() => {
    if (typeof window !== 'undefined') {
      const documentElement = document.documentElement;
      if (documentElement) {
        const head = documentElement.querySelector('head');
        let style = head?.querySelector(`[id='${variableStyleTagId}']`);
        if (!style) {
          style = createStyle(variableStyleTagId);
          style.innerHTML = cssVariablesWithMode;
          if (head) head.appendChild(style);
        }
      }
    }
  }, []);
  return /*#__PURE__*/_jsx(OverlayProvider, {
    children: /*#__PURE__*/_jsx(ToastProvider, {
      children: props.children
    })
  });
}
//# sourceMappingURL=index.next15.js.map