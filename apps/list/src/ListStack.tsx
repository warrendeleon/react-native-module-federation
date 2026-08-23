// Federation loads this exposed module, never this app's own entry, so the global.css import
// in index.js is not in the graph the host pulls. Importing it here too is what keeps the
// styles working federated: without it the build works standalone and silently no-ops in
// the host, because this remote's classes never reach the shared styling runtime.
import '../global.css';

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useDispatch, useSelector } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PokemonDetailView } from '@pokedex/detail';
import { BackPill, Box, ThemeToggle, toast } from '@pokedex/ui';
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
function PokemonDetailRoute({
  route,
  navigation,
}: {
  route: { params: DetailParams };
  navigation: { goBack: () => void };
}) {
  const { data, isLoading, isError, refetch } = useGetPokemonDetailQuery(route.params.id);
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const members = useSelector((s: PartySliceShape) => s.party?.members);
  const partyReady = members !== undefined;
  const count = members?.length ?? 0;
  const full = count >= MAX_PARTY;
  return (
    <Box className="flex-1">
    <PokemonDetailView
      pokemon={data}
      loading={isLoading}
      error={isError}
      onRetry={refetch}
      onAddToParty={() => {
        if (!data) {
          return;
        }
        dispatch(
          addToParty({ id: data.id, name: data.name, spriteUri: data.spriteUri, types: data.types }),
        );
        // Confirmation is this consumer's job — it owns the write, so it owns the feedback.
        // toast() reaches the host's Toaster through the shared singleton, sprite and all.
        toast(`${data.name} joined your party`, {
          spriteUri: data.spriteUri,
          accentType: data.types[0],
        });
      }}
      addDisabled={full || !partyReady}
      addLabel={full ? 'Party is full' : 'Add to party'}
    />
      {/* The detail arrives as a push, so the floating control says "back", not "dismiss".
          The design system owns the pill's look; only the safe-area position is this screen's. */}
      <BackPill
        onPress={() => navigation.goBack()}
        style={{ position: 'absolute', top: insets.top + 6, left: 16 }}
      />
    </Box>
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
        // The tab's chrome is this stack's own native header: an iOS large title that
        // collapses as the grid scrolls, in the display face the host binary carries. The
        // theme control rides in the right slot; it is a design-system component with no
        // props, because the colour scheme it flips lives in the shared styling runtime.
        options={{
          headerShown: true,
          title: 'Pokédex',
          headerLargeTitle: true,
          headerLargeTitleStyle: { fontFamily: 'Nunito-ExtraBold' },
          headerTitleStyle: { fontFamily: 'Nunito-Bold' },
          headerRight: () => <ThemeToggle />,
        }}
      />
      <Stack.Screen
        name="PokemonDetail"
        component={PokemonDetailRoute}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}
