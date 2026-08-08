import React, { Suspense } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import { NavigationContainer, getFocusedRouteNameFromRoute } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { pokemonKeys, queryClient } from '@pokedex/contracts';

// The host owns the shell: the query cache, the SafeAreaProvider, the navigation container, and the
// tab bar. What it mounts in each tab is a whole stack, so navigation inside a tab belongs to the
// remote that owns the tab. The host's job stops at the tab bar — and at the provider: consumers
// read the one shared cache the host provides, but the host never sees their queries at build time.
//
// The shell got shorter here. There is no store file any more, and no boot import: the party's
// state ships inside @pokedex/contracts, so it exists as soon as anything imports the package.
// Nothing has to be loaded early to make a write land somewhere.
const ListStack = React.lazy(() => import('listApp/ListStack'));
const PartyStack = React.lazy(() => import('partyApp/PartyStack'));

// A host-owned control in host-owned chrome. It never called useQuery and holds no reference to any
// remote's query, yet invalidating the ['pokemon'] prefix reaches across the seam: filters match by
// prefix, so every key the factory builds underneath it is marked stale and any mounted query
// refetches. The prefix is the only thing that crosses.
function RefreshButton() {
  return (
    <Pressable
      onPress={() => queryClient.invalidateQueries({ queryKey: pokemonKeys.all })}
      hitSlop={12}
      style={styles.refresh}
      accessibilityRole="button"
      accessibilityLabel="Refresh Pokédex">
      <Text style={styles.refreshText}>Refresh</Text>
    </Pressable>
  );
}

// A remote downloads the first time its tab is opened, so each tab renders behind a Suspense
// spinner. Wrapping once here keeps the lazy boundary out of the remotes.
function withSuspense(Remote: React.ComponentType) {
  return function Tab() {
    return (
      <Suspense fallback={<ActivityIndicator style={styles.loader} size="large" />}>
        <Remote />
      </Suspense>
    );
  };
}

const PokedexTab = withSuspense(ListStack);
const PartyTab = withSuspense(PartyStack);

// Defined once at module scope: a fresh render-prop each render would be a new component
// type to the navigator on every pass.
const renderRefreshButton = () => <RefreshButton />;

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <NavigationContainer>
          <Tab.Navigator screenOptions={{ headerShown: false }}>
            <Tab.Screen
              name="Pokédex"
              component={PokedexTab}
              // The tab header is host chrome, and the detail route brings its own stack header
              // with a back button. Showing both stacks two bars, so the host hides its own when
              // the stack is on the detail. 'PokemonDetail' is not a reach into the remote's
              // internals: the route name is part of DetailParamList in @pokedex/contracts, the
              // same agreement the params come from.
              options={({ route }) => ({
                headerShown: getFocusedRouteNameFromRoute(route) !== 'PokemonDetail',
                headerRight: renderRefreshButton,
              })}
            />
            <Tab.Screen name="Party" component={PartyTab} />
          </Tab.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  loader: { flex: 1 },
  refresh: { paddingHorizontal: 16, paddingVertical: 4 },
  refreshText: { color: '#2a75bb', fontSize: 16, fontWeight: '600' },
});
