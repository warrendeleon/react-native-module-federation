import React from 'react';
import { FlatList, RefreshControl, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useDispatch, useSelector } from 'react-redux';
import { baseApi, MAX_PARTY, type PartySliceShape, type PokemonSummary } from '@pokedex/contracts';
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
// filled by the endpoint this remote injected into the one baseApi. The chrome moved the other way:
// this screen owns its own large-title header and the pull-to-refresh below it, along with the
// list and the stack it navigates in.
//
// The look no longer lives here either. Every colour on this screen is a token class from
// @pokedex/ui, and the row markup is the design system's PokemonCard — the same component, and at
// runtime the same singleton instance, the party tab renders. FlatList stays FlatList; three
// columns is a prop, not a new list engine.
// A single shared empty array: a fresh [] per row per render would defeat the row memo
// exactly the way a fresh closure would.
const EMPTY_TYPES: string[] = [];

// One grid cell, memoised at module level so a parent render with unchanged rows costs no
// card re-renders: PokemonCard's own memo only holds if the props handed to it are stable,
// and a closure built inside renderItem is new on every pass. This wrapper owns that closure;
// it re-renders only when its item, its types or the stable handler change.
const PokedexRow = React.memo(function PokedexGridRow({
  item,
  types,
  onOpen,
}: {
  item: PokemonSummary;
  types: string[];
  onOpen: (id: number) => void;
}) {
  return (
    <Box className="w-1/3 p-1.5">
      <PokemonCard
        id={item.id}
        name={item.name}
        types={types}
        spriteUri={item.spriteUri}
        onPress={() => onOpen(item.id)}
      />
    </Box>
  );
});

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
  // Stable across renders, so the memoised rows above it actually skip work.
  const openDetail = React.useCallback(
    (id: number) => navigation.navigate('PokemonDetail', { id }),
    [navigation],
  );

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
        contentContainerStyle={[styles.gridContent, { paddingBottom: insets.bottom + 8 }]}
        ListHeaderComponent={
          // The count changes when the user adds a member from a screen away, without focus
          // moving here. A sighted user sees the number tick; a screen-reader user is told
          // nothing unless this is a live region (SC 4.1.3). The label spells the ratio out,
          // because "3/6" is read as "three slash six" or as a date, depending on the reader.
          <Box
            className="flex-row items-center justify-between px-1.5 py-2.5"
            accessible
            accessibilityLiveRegion="polite"
            accessibilityLabel={`My Party, ${partyCount} of ${MAX_PARTY}`}>
            <Text size="sm" className="font-semi text-darkGrey dark:text-lightGrey">
              My Party
            </Text>
            <Box className="rounded-full bg-lightGreen px-2.5 py-0.5 dark:bg-white/10">
              {/* darkGrey, not darkGreen: darkGreen is #A6D3A0, the grass fill, and on lightGreen
                  it measures 1.53:1. darkGrey is the colour the label beside it already uses. */}
              <Text size="xs" className="font-head text-darkGrey dark:text-pokemonGreen">
                {partyCount}/{MAX_PARTY}
              </Text>
            </Box>
          </Box>
        }
        renderItem={({ item }) => (
          <PokedexRow item={item} types={types?.[item.id] ?? EMPTY_TYPES} onOpen={openDetail} />
        )}
      />
    </ScreenContainer>
  );
}

// Static style values live in a sheet; only the safe-area offset is computed per render.
const styles = StyleSheet.create({
  gridContent: { paddingHorizontal: 10 },
});
