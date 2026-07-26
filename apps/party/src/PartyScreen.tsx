import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// The screen this remote hands to the host, the second tab. Like PokedexScreen it reads the
// safe-area inset from the host's SafeAreaProvider, so both remotes depend on the same shared
// singleton from post 3.
//
// Six fixed slots, all empty. The party remote's first version holds no state, because the app
// has no store yet: this is the smallest thing the team owning the party could ship.
const SLOTS = [1, 2, 3, 4, 5, 6];

export default function PartyScreen() {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.screen, { paddingTop: insets.top + 24 }]}>
      <Text style={styles.title}>Party</Text>
      <Text style={styles.subtitle}>
        Your party is empty. Add up to 6 Pokémon from the Pokédex.
      </Text>
      <View style={styles.grid}>
        {SLOTS.map(slot => (
          <View key={slot} style={styles.slot}>
            <Text style={styles.slotNumber}>{slot}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 24, backgroundColor: '#fff' },
  title: { fontSize: 28, fontWeight: '700' },
  subtitle: { fontSize: 14, color: '#6b7280', marginBottom: 24 },
  // alignItems: 'flex-start' stops the default stretch from overriding each slot's aspectRatio.
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'flex-start' },
  slot: {
    width: '47%',
    aspectRatio: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotNumber: { fontSize: 20, fontWeight: '600', color: '#9ca3af' },
});
