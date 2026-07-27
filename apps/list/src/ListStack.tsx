import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import PokemonDetailScreen from '@pokedex/detail';
import type { ListParamList } from './routes';
import PokedexScreen from './PokedexScreen';

// The detail screen is an installed dependency, not another deployable. It is a component two tab
// apps share, so it ships the way shared components ship: versioned, published, installed. A
// federation boundary is a team's domain; a single screen never earns one.
const Stack = createNativeStackNavigator<ListParamList>();

// What the host mounts in the Pokédex tab. Until now this remote handed over a bare screen and the
// host decided what came next. It now hands over a whole stack, so navigation inside the tab is
// this remote's business, and the host's tab bar stays on screen while a detail is pushed.
export default function ListStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="PokedexList"
        component={PokedexScreen}
        options={{ title: 'Pokédex' }}
      />
      <Stack.Screen
        name="PokemonDetail"
        component={PokemonDetailScreen}
        options={{ headerShown: true, title: '' }}
      />
    </Stack.Navigator>
  );
}
