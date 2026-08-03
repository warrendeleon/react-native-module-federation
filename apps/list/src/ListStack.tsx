import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useDispatch, useSelector } from 'react-redux';
import { PokemonDetailView } from '@pokedex/detail';
import { addToParty, MAX_PARTY, type DetailParams, type PartySliceShape } from '@pokedex/contracts';
import { useGetPokemonDetailQuery } from './detailApi';
import type { ListParamList } from './routes';
import PokedexScreen from './PokedexScreen';

// The detail view is an installed dependency, not another deployable — and it is only a view. A
// library component renders what it is given; the data belongs to this domain, so the endpoint and
// the hook live in this app, and this container composes the two.
//
// The write path is wired here too. The view exposes an optional onAddToParty; this consumer hands
// it the contract's action creator, so the tap crosses the seam as `party/add` and lands in a
// reducer another app owns. The count is read through the tolerant PartySliceShape — the party's
// slice is injected at runtime, so before its module loads, s.party is undefined and ?? 0 is the
// honest answer.
function PokemonDetailRoute({ route }: { route: { params: DetailParams } }) {
  const { data, isLoading, isError, refetch } = useGetPokemonDetailQuery(route.params.id);
  const dispatch = useDispatch();
  const count = useSelector((s: PartySliceShape) => s.party?.members.length ?? 0);
  const full = count >= MAX_PARTY;
  return (
    <PokemonDetailView
      pokemon={data}
      loading={isLoading}
      error={isError}
      onRetry={refetch}
      onAddToParty={() =>
        data && dispatch(addToParty({ id: data.id, name: data.name, spriteUri: data.spriteUri }))
      }
      addDisabled={full}
      addLabel={full ? 'Party is full' : 'Add to party'}
    />
  );
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
