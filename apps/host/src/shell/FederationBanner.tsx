import React, { useSyncExternalStore } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colours } from '@pokedex/ui';

import type { FederationMode } from './remoteLocator';
import { getFederationStatus, subscribeFederationStatus } from './scriptManager';

// --- One line saying where this launch's code came from. It exists because the difference
// between a remote loaded from a dev server and the same remote loaded from a CDN is otherwise
// invisible: the app looks identical either way, which is the point of the whole arrangement and
// also what makes a demo of it unprovable. The line makes the mode and the resolved versions
// something you can photograph.
//
// It follows the status as it changes, not only as it was at launch: a remote that drops to its
// copy in the binary mid-session is marked on the line the moment it does.
//
// Host operational chrome rather than part of the design system, so it is plain React Native with
// its own stylesheet. It still takes its colours from the shared tokens, because a surface with
// text on it has to clear the same contrast bar as everything else: each fill in MODE_FILL carries
// white text, and every pair is measured in the design system's contrast matrix, which is where
// every token pairing in this federation is measured. ---

export const FEDERATION_BANNER_HEIGHT = 26;

// The bottom tab bar's own height, the same number the toaster is floated clear of.
const TAB_BAR_HEIGHT = 49;

// dev is the neutral state, cdn is the one the operational layer exists for, bundled is the app
// running on its own copies because the CDN's versions could not be used, and unresolved is a
// failure: neither the CDN's versions nor a copy could be used, so no remote can load at all.
const MODE_FILL: Record<FederationMode, string> = {
  dev: colours.darkGrey,
  cdn: colours.blueText,
  bundled: colours.purple,
  unresolved: colours.red,
};

export function FederationBanner() {
  const insets = useSafeAreaInsets();
  const { mode, source, versions, embedded } = useSyncExternalStore(
    subscribeFederationStatus,
    getFederationStatus,
  );

  const names = Object.keys(versions).sort();
  // In bundled mode every remote runs from its copy and the mode already says so. In a CDN launch
  // a remote that dropped to its copy is the exception, so it is the one that gets marked.
  const pairs = names.map(name =>
    mode === 'cdn' && embedded.includes(name)
      ? `${name} ${versions[name]} embedded`
      : `${name} ${versions[name]}`,
  );
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
