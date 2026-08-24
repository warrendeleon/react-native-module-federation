"use strict";

import React from 'react';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { bgClassForType, tintBgClassForType } from "../tokens/typeColours.js";
import { Box } from "./ui/box/index.js";
import { Card } from "./ui/card/index.js";
import { Image } from "./ui/image/index.js";
import { Pressable } from "./ui/pressable/index.js";
import { Text } from "./ui/text/index.js";
import { TypeBadge } from "./type-badge.js";

// --- The Pokédex grid's primary card. White rounded background, hashed ID, circular tinted
// sprite area (background tint is the primary type's colour at 30% opacity so the sprite
// stays the focal point), name in semibold, type badges in a row at the bottom. Tapping the
// card runs onPress; what the press navigates to is the consumer's business.
//
// Composed from Gluestack primitives only: Pressable wraps Card; the sprite background is a
// Box with a tint-class from the token preset; the sprite itself is Gluestack Image; name +
// ID are Text; type pills are TypeBadge (which composes Box + Text). Styling is class-based
// throughout; the one style object is the animated press spring, which has to be a style
// because Reanimated drives it per frame. ---
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
function PokemonCardInner({
  id,
  name,
  types,
  spriteUri,
  spriteSource,
  onPress,
  onRemove
}) {
  // Press feedback as a real spring rather than a static transform: the scale eases down on
  // touch and springs back on release, on the UI thread.
  const pressed = useSharedValue(0);
  const springStyle = useAnimatedStyle(() => ({
    transform: [{
      scale: withSpring(pressed.value ? 0.96 : 1, {
        damping: 18,
        stiffness: 320
      })
    }]
  }));
  const primaryType = types[0] ?? 'normal';
  const tintBg = tintBgClassForType(primaryType);
  const accent = bgClassForType(primaryType);
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
  // When type loading has degraded the caller hands an empty array; the label then stops at
  // the number instead of announcing a dangling ", type" with nothing in front of it.
  const a11yLabel = types.length > 0 ? `${name}, number ${paddedId}, ${types.join(' and ')} ${types.length > 1 ? 'types' : 'type'}` : `${name}, number ${paddedId}`;
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
    className: "active:opacity-90",
    onPressIn: () => {
      pressed.value = 1;
    },
    onPressOut: () => {
      pressed.value = 0;
    },
    children: /*#__PURE__*/_jsx(Animated.View, {
      style: springStyle,
      children: /*#__PURE__*/_jsxs(Card, {
        className: "items-center overflow-hidden rounded-2xl bg-white p-3 pb-4 shadow-sm shadow-black/10 dark:border dark:border-white/10 dark:bg-black",
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
          size: "md",
          className: "mb-1.5 text-center font-head text-black dark:text-white",
          children: name
        }), /*#__PURE__*/_jsx(Box, {
          className: "h-5 flex-row justify-center gap-1 overflow-hidden",
          children: types.slice(0, 2).map(t => /*#__PURE__*/_jsx(TypeBadge, {
            type: t,
            size: "xs"
          }, t))
        }), /*#__PURE__*/_jsx(Box, {
          className: `absolute bottom-0 left-0 right-0 h-1.5 dark:opacity-60 ${accent}`
        })]
      })
    })
  });
}

// Memoised: in a long grid the card's props are stable row to row, and its theme-dependent
// classes update through the styling runtime rather than a React re-render. The memo only
// pays off when the consumer keeps its callback props stable too (useCallback in the grid
// screens); a fresh onPress per parent render would defeat it row by row.
export const PokemonCard = /*#__PURE__*/React.memo(PokemonCardInner);
//# sourceMappingURL=pokemon-card.js.map