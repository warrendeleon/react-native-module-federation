import React from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { PokemonDetail } from '@pokedex/contracts';

// The static copy of the Pokémon data that lived here in 1.0.0 is gone, and so is the data access
// that briefly replaced it. This is a view: it renders what it is handed and reports what is
// pressed. Where the data comes from is the consumer's business; each app composes this view with
// its own data in its own container route.
//
// The three add-to-party props are optional for the same reason. A write that crosses a domain
// boundary is wired by the consumer, so this view holds no action creator and no store import: it
// renders an Add button when a consumer hands it a handler, and nothing when it does not.
export interface PokemonDetailViewProps {
  pokemon?: PokemonDetail;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  onAddToParty?: () => void;
  addDisabled?: boolean;
  addLabel?: string;
}

export default function PokemonDetailView({
  pokemon,
  loading,
  error,
  onRetry,
  onAddToParty,
  addDisabled,
  addLabel,
}: PokemonDetailViewProps) {
  const insets = useSafeAreaInsets();

  if (loading) {
    return (
      <View style={styles.centre}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error || !pokemon) {
    return (
      <View style={styles.centre}>
        <Text style={styles.error}>Couldn't reach PokéAPI.</Text>
        <Pressable style={styles.retry} onPress={onRetry}>
          <Text style={styles.retryText}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 24 }]}>
      <Text style={styles.number}>#{String(pokemon.id).padStart(3, '0')}</Text>
      <Text style={styles.name}>{pokemon.name}</Text>
      <Image style={styles.sprite} source={{ uri: pokemon.spriteUri }} />
      <View style={styles.types}>
        {pokemon.types.map(type => (
          <View key={type} style={styles.type}>
            <Text style={styles.typeLabel}>{type}</Text>
          </View>
        ))}
      </View>
      {onAddToParty && (
        <Pressable
          style={[styles.add, addDisabled && styles.addDisabled]}
          onPress={onAddToParty}
          disabled={addDisabled}
          accessibilityRole="button">
          <Text style={styles.addText}>{addLabel ?? 'Add to party'}</Text>
        </Pressable>
      )}
      <Text style={styles.footer}>Served by @pokedex/detail</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 24, alignItems: 'center', backgroundColor: '#fff' },
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  error: { fontSize: 16, color: '#6b7280' },
  retry: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#2a75bb',
    borderRadius: 8,
  },
  retryText: { color: '#fff', fontWeight: '600' },
  number: { fontSize: 14, color: '#9ca3af', fontVariant: ['tabular-nums'] },
  name: { fontSize: 32, fontWeight: '700' },
  sprite: { width: 220, height: 220, marginVertical: 8 },
  types: { flexDirection: 'row', gap: 8 },
  type: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#f3f4f6',
  },
  typeLabel: { fontSize: 14, fontWeight: '600', color: '#374151' },
  add: {
    marginTop: 24,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#2a75bb',
    borderRadius: 8,
  },
  addDisabled: { backgroundColor: '#9ca3af' },
  addText: { color: '#fff', fontWeight: '600' },
  footer: { marginTop: 24, fontSize: 14, color: '#6b7280' },
});
