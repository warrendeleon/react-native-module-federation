import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colours } from '@pokedex/ui';

import type { FederationMode } from './remoteLocator';
import { getFederationStatus } from './scriptManager';

// --- One line saying where this launch's code came from. It exists because the difference
// between a remote loaded from a dev server and the same remote loaded from a CDN is otherwise
// invisible: the app looks identical either way, which is the point of the whole arrangement and
// also what makes a demo of it unprovable. The line makes the mode and the resolved versions
// something you can photograph.
//
// Host operational chrome rather than part of the design system, so it is plain React Native with
// its own stylesheet. It still takes its colours from the shared tokens, because a surface with
// text on it has to clear the same contrast bar as everything else: each fill below carries white
// text, and all three pairs are measured in the design system's contrast matrix, which is where
// every token pairing in this federation is measured. ---

export const FEDERATION_BANNER_HEIGHT = 26;

// The bottom tab bar's own height, the same number the toaster is floated clear of.
const TAB_BAR_HEIGHT = 49;

// dev is the neutral state, cdn is the one the operational layer exists for, and unresolved is a
// failure: no version map, so no remote can load at all.
const MODE_FILL: Record<FederationMode, string> = {
  dev: colours.darkGrey,
  cdn: colours.blueText,
  unresolved: colours.red,
};

export function FederationBanner() {
  const insets = useSafeAreaInsets();
  const { mode, source, versions } = getFederationStatus();

  const names = Object.keys(versions).sort();
  const pairs = names.map(name => `${name} ${versions[name]}`);
  const detail = pairs.length > 0 ? pairs.join(' · ') : source;
  // Spoken separately from what is drawn. The middle dot is a visual separator: a screen reader
  // announces it as a word, as a pause, or not at all, none of which is the sentence intended.
  const spoken = pairs.length > 0 ? pairs.join(', ') : source;

  return (
    <View
      pointerEvents="none"
      style={[styles.wrap, { bottom: insets.bottom + TAB_BAR_HEIGHT + 6 }]}
      accessible
      accessibilityLabel={`Federation mode ${mode}. ${spoken}`}>
      <View style={[styles.pill, { backgroundColor: MODE_FILL[mode] }]}>
        <Text style={styles.text} numberOfLines={1}>
          {mode} · {detail}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  pill: {
    maxWidth: '92%',
    height: FEDERATION_BANNER_HEIGHT,
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  text: {
    color: colours.white,
    fontFamily: 'Nunito-SemiBold',
    fontSize: 12,
  },
});
