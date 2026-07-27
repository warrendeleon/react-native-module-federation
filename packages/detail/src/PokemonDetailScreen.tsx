import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { DetailParams } from '@pokedex/contracts';

// This package's own copy of the Pokémon data. The list app has one too, and the two have already
// drifted: the list needs a name, this screen needs types as well. Two copies of the same facts is
// the problem live data solves, and that is post 6. Here it keeps the post about the seam rather
// than the network.
const POKEMON: Record<number, { name: string; types: string[] }> = {
  1: { name: 'Bulbasaur', types: ['Grass', 'Poison'] },
  4: { name: 'Charmander', types: ['Fire'] },
  7: { name: 'Squirtle', types: ['Water'] },
  25: { name: 'Pikachu', types: ['Electric'] },
  133: { name: 'Eevee', types: ['Normal'] },
};

const spriteUrl = (id: number) =>
  `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;

// The params come from @pokedex/contracts; the props are this package's own. The screen is mounted
// by two different stacks it has never seen, so it types the route structurally rather than
// importing the navigator that renders it — and stays free of a navigation dependency as a result.
export interface PokemonDetailScreenProps {
  route: { params: DetailParams };
}

export default function PokemonDetailScreen({ route }: PokemonDetailScreenProps) {
  const insets = useSafeAreaInsets();
  const { id } = route.params;
  const pokemon = POKEMON[id];

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 24 }]}>
      <Text style={styles.number}>#{String(id).padStart(3, '0')}</Text>
      <Text style={styles.name}>{pokemon?.name ?? 'Unknown'}</Text>
      <Image style={styles.sprite} source={{ uri: spriteUrl(id) }} />
      <View style={styles.types}>
        {(pokemon?.types ?? []).map(type => (
          <View key={type} style={styles.type}>
            <Text style={styles.typeLabel}>{type}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.footer}>Served by @pokedex/detail</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 24, alignItems: 'center', backgroundColor: '#fff' },
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
  footer: { marginTop: 24, fontSize: 14, color: '#6b7280' },
});
