import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { PokedexScreenProps } from '@pokedex/contracts';

import { useGetPokemonListQuery } from './listApi';

// The screen this remote hands to the host. Its props still come from @pokedex/contracts — the seam
// post 5 typed is unchanged — but the data no longer lives here. useGetPokemonListQuery reads the
// shared cache in the host's store, filled by the endpoint this remote injected into the one baseApi.
// The host now owns the title and the refresh control in its header; this screen owns only the list.
export default function PokedexScreen({
  onSelectPokemon,
  onLongPressPokemon,
}: PokedexScreenProps) {
  const insets = useSafeAreaInsets();
  const { data, isLoading, isError, refetch } = useGetPokemonListQuery();

  if (isLoading) {
    return (
      <View style={styles.centre}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (isError || !data) {
    return (
      <View style={styles.centre}>
        <Text style={styles.error}>Couldn't reach PokéAPI.</Text>
        <Pressable style={styles.retry} onPress={() => refetch()}>
          <Text style={styles.retryText}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <FlatList
      data={data}
      keyExtractor={p => String(p.id)}
      contentContainerStyle={{ paddingBottom: insets.bottom + 8 }}
      renderItem={({ item }) => (
        <Pressable
          style={styles.row}
          onPress={() => onSelectPokemon(item.id)}
          onLongPress={() => onLongPressPokemon?.(item.id)}>
          <Image source={{ uri: item.spriteUri }} style={styles.sprite} />
          <Text style={styles.number}>#{String(item.id).padStart(3, '0')}</Text>
          <Text style={styles.name}>{item.name}</Text>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  error: { fontSize: 16, color: '#6b7280' },
  retry: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#2a75bb',
    borderRadius: 8,
  },
  retryText: { color: '#fff', fontWeight: '600' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
  },
  sprite: { width: 48, height: 48 },
  number: { width: 52, color: '#9ca3af', fontVariant: ['tabular-nums'] },
  name: { fontSize: 16, fontWeight: '500' },
});
