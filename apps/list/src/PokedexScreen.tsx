import React from 'react';
import { FlatList, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useDispatch, useSelector } from 'react-redux';
import { baseApi, MAX_PARTY, type PartySliceShape } from '@pokedex/contracts';
import {
  Box,
  ErrorState,
  LoadingState,
  PokemonCard,
  ScreenContainer,
  Text,
} from '@pokedex/ui';
import type { ListParamList } from './routes';

import { useGetPokemonListQuery } from './listApi';
import { useGetPokemonTypesQuery } from './typesApi';

// The data no longer lives here. useGetPokemonListQuery reads the shared cache in the host's store,
// filled by the endpoint this remote injected into the one baseApi. The host owns the title and the
// refresh control in its header; this screen owns the list and the stack it navigates in.
//
// The look no longer lives here either. Every colour on this screen is a token class from
// @pokedex/ui, and the row markup is the design system's PokemonCard — the same component, and at
// runtime the same singleton instance, the party tab renders. FlatList stays FlatList; three
// columns is a prop, not a new list engine.
export default function PokedexScreen() {
  const insets = useSafeAreaInsets();
  // useNavigation reads a React context the host's NavigationContainer provides. It resolves here
  // only because @react-navigation/native is a shared singleton: with two copies in the runtime,
  // this remote would look for the navigator in a context the host never filled.
  const navigation = useNavigation<NativeStackNavigationProp<ListParamList>>();
  const dispatch = useDispatch();
  const { data, isLoading, isError, refetch, isFetching } = useGetPokemonListQuery();
  // The rows come over REST, the badges over GraphQL, and the screen treats them as one source
  // because they land in the same cache. No loading branch and no error branch for this one: if the
  // types have not arrived, or never arrive, each card simply renders without badges.
  const { data: types, isFetching: isFetchingTypes } = useGetPokemonTypesQuery();
  // A foreign module reading another app's state, through the contract's tolerant shape. Until the
  // party's module loads, s.party is undefined; ?? 0 renders an honest zero rather than crashing
  // on a slice that is not there yet.
  const partyCount = useSelector((s: PartySliceShape) => s.party?.members.length ?? 0);

  if (isLoading) {
    return (
      <ScreenContainer edges={[]}>
        <LoadingState caption="Loading Pokédex…" />
      </ScreenContainer>
    );
  }

  if (isError || !data) {
    return (
      <ScreenContainer edges={[]}>
        <ErrorState message="Couldn't reach PokéAPI." onRetry={() => refetch()} retryLabel="Try again" />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer edges={[]}>
      <FlatList
        data={data}
        keyExtractor={p => String(p.id)}
        numColumns={3}
        contentInsetAdjustmentBehavior="automatic"
        // Pull to refresh replaces post 6's header button, and dispatches the same thing the
        // button did: one invalidated tag, which both endpoints provide, so the REST rows and
        // the GraphQL badges refetch together from a gesture this remote owns.
        refreshControl={
          <RefreshControl
            refreshing={isFetching || isFetchingTypes}
            onRefresh={() => dispatch(baseApi.util.invalidateTags(['PokemonList']))}
          />
        }
        contentContainerStyle={{ paddingHorizontal: 10, paddingBottom: insets.bottom + 8 }}
        ListHeaderComponent={
          <Box className="flex-row items-center justify-between px-1.5 py-2.5">
            <Text size="sm" className="font-semi text-darkGrey dark:text-lightGrey">
              My Party
            </Text>
            <Box className="rounded-full bg-lightGreen px-2.5 py-0.5 dark:bg-white/10">
              <Text size="xs" className="font-head text-darkGreen dark:text-pokemonGreen">
                {partyCount}/{MAX_PARTY}
              </Text>
            </Box>
          </Box>
        }
        renderItem={({ item }) => (
          <Box className="w-1/3 p-1.5">
            <PokemonCard
              id={item.id}
              name={item.name}
              types={types?.[item.id] ?? []}
              spriteUri={item.spriteUri}
              onPress={() => navigation.navigate('PokemonDetail', { id: item.id })}
            />
          </Box>
        )}
      />
    </ScreenContainer>
  );
}
