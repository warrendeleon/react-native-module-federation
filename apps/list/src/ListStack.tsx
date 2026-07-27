import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { PokemonDetailView } from '@pokedex/detail';
import { useGetPokemonDetailQuery } from './detailApi';
import type { DetailParams } from '@pokedex/contracts';
import type { ListParamList } from './routes';
import PokedexScreen from './PokedexScreen';

// The detail view is an installed dependency, not another deployable — and it is only a view. A
// library component renders what it is given; the data belongs to this domain, so the endpoint and
// the hook live in this app, and this container composes the two.
function PokemonDetailRoute({ route }: { route: { params: DetailParams } }) {
  const { data, isLoading, isError, refetch } = useGetPokemonDetailQuery(route.params.id);
  return <PokemonDetailView pokemon={data} loading={isLoading} error={isError} onRetry={refetch} />;
}

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
        component={PokemonDetailRoute}
        options={{ headerShown: true, title: '' }}
      />
    </Stack.Navigator>
  );
}
