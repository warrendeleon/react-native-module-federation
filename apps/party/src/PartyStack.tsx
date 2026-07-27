import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import PokemonDetailScreen from '@pokedex/detail';
import type { PartyParamList } from './routes';
import PartyScreen from './PartyScreen';

// The same installed screen the list stack mounts. Two consumers, one package, and neither
// consumer knows about the other; the registry is the only thing they share.
const Stack = createNativeStackNavigator<PartyParamList>();

// The party tab's stack. The detail route is declared and typed but nothing pushes it yet: the
// party has no members to tap until it has state, which is post 7. It is here now because the
// contract is what this post is about, and both consumers of that contract should be visible.
export default function PartyStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="PartyMain"
        component={PartyScreen}
        options={{ title: 'Party' }}
      />
      <Stack.Screen
        name="PokemonDetail"
        component={PokemonDetailScreen}
        options={{ headerShown: true, title: '' }}
      />
    </Stack.Navigator>
  );
}
