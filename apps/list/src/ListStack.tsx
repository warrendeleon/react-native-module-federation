import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useStore } from 'zustand';
import { PokemonDetailView } from '@pokedex/detail';
import { MAX_PARTY, partyStore, type DetailParams } from '@pokedex/contracts';
import { usePokemonDetail } from './detailApi';
import type { ListParamList } from './routes';
import PokedexScreen from './PokedexScreen';

// The detail view is an installed dependency, not another deployable — and it is only a view. A
// library component renders what it is given, so the data belongs to this domain and this container
// composes the two. Nothing in this file changed when the state stack did: the same props, the same
// package version, wired from a different source.
//
// The write path is wired here too. The view exposes an optional onAddToParty; this consumer hands
// it the store's `add`, so the tap runs a function another team wrote. The count comes from the
// same store. There is no tolerant read shape any more: the store ships inside the contract
// package, so it exists from the first import and members is an array, never undefined.
function PokemonDetailRoute({ route }: { route: { params: DetailParams } }) {
  const { data, isLoading, isError, refetch } = usePokemonDetail(route.params.id);
  const add = useStore(partyStore, s => s.add);
  const count = useStore(partyStore, s => s.members.length);
  const full = count >= MAX_PARTY;

  // The demo the article is about, and the reason it sits here rather than in the party app: this
  // module has no business writing the party's state, and nothing stops it. `add` refuses a seventh
  // member because the cap is inside `add`. setState is public on every Zustand store and goes
  // straight to the state, so this line puts seven Pokémon in a six-slot party with no type error,
  // no warning, and no way for the owning team to see it happen. It is on a long-press purely so
  // it can be filmed.
  const bypassTheCap = () =>
    data &&
    partyStore.setState(s => ({
      members: [
        ...s.members,
        { uid: `bypass-${s.members.length}`, id: data.id, name: data.name, spriteUri: data.spriteUri },
      ],
    }));

  return (
    <Pressable style={styles.fill} onLongPress={bypassTheCap} delayLongPress={800}>
      <PokemonDetailView
        pokemon={data}
        loading={isLoading}
        error={isError}
        onRetry={refetch}
        onAddToParty={() =>
          data && add({ id: data.id, name: data.name, spriteUri: data.spriteUri })
        }
        addDisabled={full}
        addLabel={full ? 'Party is full' : 'Add to party'}
      />
    </Pressable>
  );
}

const Stack = createNativeStackNavigator<ListParamList>();

// What the host mounts in the Pokédex tab: a whole stack, so navigation inside the tab is this
// remote's business and the host's tab bar stays on screen while a detail is pushed.
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

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
