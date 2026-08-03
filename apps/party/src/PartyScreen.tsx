import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useDispatch, useSelector } from 'react-redux';
import { MAX_PARTY, type PartySliceShape } from '@pokedex/contracts';
import { remove } from './partySlice';
import type { PartyParamList } from './routes';

// The owner reads its own state through the same tolerant shape foreign modules use — even the
// owner's first render can beat the first action into the store, so the slice key may still be
// undefined here. (Importing `remove` above also runs partySlice.ts, so opening this tab injects
// the slice as a side effect; the host's boot import exists so nobody has to rely on that.)
export default function PartyScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<PartyParamList>>();
  const dispatch = useDispatch();
  const members = useSelector((s: PartySliceShape) => s.party?.members ?? []);

  // Six slots: the first `members.length` filled, the rest the dashed placeholders from post 4.
  const slots = Array.from({ length: MAX_PARTY }, (_, i) => members[i]);

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 24 }]}>
      <Text style={styles.title}>
        Party <Text style={styles.count}>{members.length}/{MAX_PARTY}</Text>
      </Text>
      <Text style={styles.subtitle}>
        {members.length === 0
          ? 'Your party is empty. Add up to 6 Pokémon from the Pokédex.'
          : 'Tap a Pokémon for its detail, or remove it to free the slot.'}
      </Text>
      <View style={styles.grid}>
        {slots.map((member, index) =>
          member ? (
            <Pressable
              key={member.uid}
              style={[styles.slot, styles.slotFilled]}
              onPress={() => navigation.navigate('PokemonDetail', { id: member.id })}>
              <Pressable
                style={styles.remove}
                hitSlop={8}
                onPress={() => dispatch(remove(member.uid))}
                accessibilityRole="button"
                accessibilityLabel={`Remove ${member.name} from party`}>
                <Text style={styles.removeText}>×</Text>
              </Pressable>
              <Image source={{ uri: member.spriteUri }} style={styles.sprite} />
              <Text style={styles.name}>{member.name}</Text>
            </Pressable>
          ) : (
            <View key={`empty-${index}`} style={styles.slot}>
              <Text style={styles.slotNumber}>{index + 1}</Text>
            </View>
          ),
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 24, backgroundColor: '#fff' },
  title: { fontSize: 28, fontWeight: '700' },
  count: { color: '#2a75bb', fontVariant: ['tabular-nums'] },
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
  slotFilled: {
    borderStyle: 'solid',
    borderColor: '#2a75bb',
    backgroundColor: '#fff',
  },
  slotNumber: { fontSize: 20, fontWeight: '600', color: '#9ca3af' },
  sprite: { width: 96, height: 96 },
  name: { fontSize: 15, fontWeight: '600', marginTop: 4 },
  remove: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeText: { fontSize: 16, color: '#6b7280', lineHeight: 18 },
});
