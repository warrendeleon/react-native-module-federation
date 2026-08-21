// Federation loads this exposed module, never this app's own entry, so the global.css import
// in index.js is not in the graph the host pulls. Importing it here too is what keeps the
// styles working federated: without it the build works standalone and silently no-ops in
// the host, because this remote's classes never reach the shared styling runtime.
import '../global.css';

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
// reducer another app owns. The party is read through the tolerant PartySliceShape — the party's
// slice is injected at runtime, so until its module loads, s.party is undefined. That undefined
// does double duty: the count falls back to 0 honestly, and the add stays disabled, because a
// dispatch before the reducer exists would vanish without a trace. The host surfaces the slice
// with the contract's partyStateReady marker the moment the module lands, so the gate lifts on
// its own — usually before anyone has navigated this deep.
function PokemonDetailRoute({ route }: { route: { params: DetailParams } }) {
  const { data, isLoading, isError, refetch } = useGetPokemonDetailQuery(route.params.id);
  const dispatch = useDispatch();
  const members = useSelector((s: PartySliceShape) => s.party?.members);
  const partyReady = members !== undefined;
  const count = members?.length ?? 0;
  const full = count >= MAX_PARTY;
  return (
    <PokemonDetailView
      pokemon={data}
      loading={isLoading}
      error={isError}
      onRetry={refetch}
      onAddToParty={() =>
        data &&
        dispatch(
          addToParty({ id: data.id, name: data.name, spriteUri: data.spriteUri, types: data.types }),
        )
      }
      addDisabled={full || !partyReady}
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
