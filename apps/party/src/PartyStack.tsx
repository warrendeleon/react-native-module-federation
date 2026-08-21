// Federation loads this exposed module, never this app's own entry, so the global.css import
// in index.js is not in the graph the host pulls. Importing it here too is what keeps the
// styles working federated: without it the build works standalone and silently no-ops in
// the host, because this remote's classes never reach the shared styling runtime.
import '../global.css';

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { PokemonDetailView } from '@pokedex/detail';
import { useGetPokemonDetailQuery } from './detailApi';
import type { DetailParams } from '@pokedex/contracts';
import type { PartyParamList } from './routes';
import PartyScreen from './PartyScreen';

// The same container shape the list app wrote, feeding the same installed view from this app's own
// endpoint. What it does NOT pass is the point: no onAddToParty, so a detail opened from the party
// shows no Add button. The view renders what its consumer wires, and this consumer wires no write.
function PokemonDetailRoute({ route }: { route: { params: DetailParams } }) {
  const { data, isLoading, isError, refetch } = useGetPokemonDetailQuery(route.params.id);
  return <PokemonDetailView pokemon={data} loading={isLoading} error={isError} onRetry={refetch} />;
}

const Stack = createNativeStackNavigator<PartyParamList>();

// The party tab's stack. The detail route was declared and typed two posts before anything pushed
// it; now tapping a party member does.
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
        component={PokemonDetailRoute}
        options={{ headerShown: true, title: '' }}
      />
    </Stack.Navigator>
  );
}
