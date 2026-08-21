"use strict";

import React from 'react';
import { tintBgClassForType } from "../tokens/typeColours.js";
import { Box } from "./ui/box/index.js";
import { Card } from "./ui/card/index.js";
import { Image } from "./ui/image/index.js";
import { Pressable } from "./ui/pressable/index.js";
import { Text } from "./ui/text/index.js";
import { TypeBadge } from "./type-badge.js";

// --- The Pokédex grid's primary card. White rounded background, hashed ID, circular tinted
// sprite area (background tint is the primary type's colour at 30% opacity so the sprite
// stays the focal point), name in semibold, type badges in a row at the bottom. Tapping the
// card runs onPress (typically routes to Detail via shell.navigateTo).
//
// Composed from Gluestack primitives only: Pressable wraps Card; the sprite background is a
// Box with a tint-class from the token preset; the sprite itself is Gluestack Image; name +
// ID are Text; type pills are TypeBadge (which composes Box + Text). No inline styles. ---
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function PokemonCard({
  id,
  name,
  types,
  spriteUri,
  spriteSource,
  onPress,
  onRemove
}) {
  const primaryType = types[0] ?? 'normal';
  const tintBg = tintBgClassForType(primaryType);
  const paddedId = String(id).padStart(3, '0');
  const idLabel = `#${paddedId}`;
  const source = spriteSource ?? (spriteUri ? {
    uri: spriteUri
  } : undefined);

  // The whole card is one accessible button, so a screen reader announces this name rather than
  // the concatenated child text. Remove is a custom action on that same element, not a nested
  // button: a Pressable sets accessible=true, which on iOS collapses its descendants, so a child
  // button would be unreachable to VoiceOver. The visual ✕ stays for sighted users but is taken
  // out of the a11y tree (the action covers screen-reader users) with a hitSlop-enlarged target.
  const a11yLabel = `${name}, number ${paddedId}, ${types.join(' and ')} type`;
  return /*#__PURE__*/_jsx(Pressable, {
    onPress: onPress,
    accessibilityRole: "button",
    accessibilityLabel: a11yLabel,
    accessibilityHint: onPress ? 'Opens details' : undefined,
    accessibilityActions: onRemove ? [{
      name: 'remove',
      label: 'Remove from party'
    }] : undefined,
    onAccessibilityAction: onRemove ? event => {
      if (event.nativeEvent.actionName === 'remove') onRemove();
    } : undefined,
    className: "active:opacity-80",
    children: /*#__PURE__*/_jsxs(Card, {
      className: "items-center rounded-2xl bg-white p-3 shadow-sm shadow-black/10 dark:border dark:border-white/10 dark:bg-black",
      children: [onRemove ? /*#__PURE__*/_jsx(Pressable, {
        onPress: onRemove,
        accessible: false,
        importantForAccessibility: "no-hide-descendants",
        accessibilityElementsHidden: true,
        hitSlop: 10,
        className: "absolute right-1.5 top-1.5 z-10 h-6 w-6 items-center justify-center rounded-full bg-red active:opacity-70",
        children: /*#__PURE__*/_jsx(Text, {
          size: "xs",
          bold: true,
          className: "text-white",
          children: "\u2715"
        })
      }) : null, /*#__PURE__*/_jsx(Box, {
        className: "mb-1 self-start rounded-md bg-offGrey px-1.5 py-0.5 dark:bg-white/10",
        children: /*#__PURE__*/_jsx(Text, {
          size: "xs",
          className: "text-midGrey",
          children: idLabel
        })
      }), /*#__PURE__*/_jsx(Box, {
        className: `mb-2 h-16 w-16 items-center justify-center rounded-full ${tintBg}`,
        children: source ? /*#__PURE__*/_jsx(Image, {
          source: source,
          resizeMode: "contain",
          className: "h-12 w-12",
          alt: name
        }) : null
      }), /*#__PURE__*/_jsx(Text, {
        bold: true,
        size: "md",
        className: "mb-1.5 text-center text-black dark:text-white",
        children: name
      }), /*#__PURE__*/_jsx(Box, {
        className: "flex-row flex-wrap justify-center gap-1",
        children: types.map(t => /*#__PURE__*/_jsx(TypeBadge, {
          type: t,
          size: "xs"
        }, t))
      })]
    })
  });
}
//# sourceMappingURL=pokemon-card.js.map