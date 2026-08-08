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
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useStore } from 'zustand';
import { MAX_PARTY, partyStore } from '@pokedex/contracts';
import type { ListParamList } from './routes';

import { usePokemonList } from './listApi';

// The data does not live here. usePokemonList reads the shared cache the host provides, under a key
// the contract's factory built. The host owns the title and the refresh control in its header; this
// screen owns the list and the stack it navigates in.
export default function PokedexScreen() {
  const insets = useSafeAreaInsets();
  // useNavigation reads a React context the host's NavigationContainer provides. It resolves here
  // only because @react-navigation/native is a shared singleton: with two copies in the runtime,
  // this remote would look for the navigator in a context the host never filled.
  const navigation = useNavigation<NativeStackNavigationProp<ListParamList>>();
  const { data, isLoading, isError, refetch } = usePokemonList();
  // A foreign module reading another app's state. The selector runs on every store change and this
  // component re-renders only when the number it returns changes.
  const partyCount = useStore(partyStore, s => s.members.length);

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
      ListHeaderComponent={
        <Text style={styles.partyCount}>
          My Party {partyCount}/{MAX_PARTY}
        </Text>
      }
      renderItem={({ item }) => (
        <Pressable
          style={styles.row}
          onPress={() => navigation.navigate('PokemonDetail', { id: item.id })}>
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
  partyCount: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 13,
    fontWeight: '600',
    color: '#2a75bb',
    fontVariant: ['tabular-nums'],
  },
});
