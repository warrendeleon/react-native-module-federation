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
import { useSelector } from 'react-redux';
import { MAX_PARTY, type PartySliceShape } from '@pokedex/contracts';
import type { ListParamList } from './routes';

import { useGetPokemonListQuery } from './listApi';
import { useGetPokemonTypesQuery } from './typesApi';

// The data no longer lives here. useGetPokemonListQuery reads the shared cache in the host's store,
// filled by the endpoint this remote injected into the one baseApi. The host now owns the title and
// the refresh control in its header; this screen owns the list and the stack it navigates in.
export default function PokedexScreen() {
  const insets = useSafeAreaInsets();
  // useNavigation reads a React context the host's NavigationContainer provides. It resolves here
  // only because @react-navigation/native is a shared singleton: with two copies in the runtime,
  // this remote would look for the navigator in a context the host never filled.
  const navigation = useNavigation<NativeStackNavigationProp<ListParamList>>();
  const { data, isLoading, isError, refetch } = useGetPokemonListQuery();
  // The rows come over REST, the badges over GraphQL, and the screen treats them as one source
  // because they land in the same cache. No loading branch and no error branch for this one: if the
  // types have not arrived, or never arrive, each row simply renders without badges.
  const { data: types } = useGetPokemonTypesQuery();
  // A foreign module reading another app's state, through the contract's tolerant shape. Until the
  // party's module loads, s.party is undefined; ?? 0 renders an honest zero rather than crashing
  // on a slice that is not there yet.
  const partyCount = useSelector((s: PartySliceShape) => s.party?.members.length ?? 0);

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
          <View style={styles.badges}>
            {types?.[item.id]?.map(type => (
              <View key={type} style={styles.badge}>
                <Text style={styles.badgeText}>{type}</Text>
              </View>
            ))}
          </View>
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
  name: { fontSize: 16, fontWeight: '500', flex: 1 },
  // The badges sit inside the row's existing height, so a row with no types yet is the same size as
  // one with two. Nothing moves when the GraphQL query lands.
  badges: { flexDirection: 'row', gap: 6 },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: '#eef2ff',
  },
  badgeText: { fontSize: 11, fontWeight: '600', color: '#4338ca' },
  partyCount: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 13,
    fontWeight: '600',
    color: '#2a75bb',
    fontVariant: ['tabular-nums'],
  },
});
