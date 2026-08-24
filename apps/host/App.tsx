import React, { Suspense, useEffect } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider, useDispatch } from 'react-redux';
import { NavigationContainer, getFocusedRouteNameFromRoute } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { baseApi, partyStateReady } from '@pokedex/contracts';

import { store } from './src/store';

// The host owns the shell: the Redux store, the SafeAreaProvider, the navigation container, and the
// tab bar. What it mounts in each tab is no longer a screen but a whole stack, so navigation inside
// a tab belongs to the remote that owns the tab. The host's job stops at the tab bar — and at the
// store: consumers read the one shared cache the host provides, but the host never sees their
// endpoints at build time.
const ListStack = React.lazy(() => import('listApp/ListStack'));
const PartyStack = React.lazy(() => import('partyApp/PartyStack'));

// A host-owned control in host-owned chrome. It never imported getPokemonList and holds no
// reference to it, yet dispatching invalidateTags(['PokemonList']) reaches across the seam: the tag
// is the only thing that crosses, and the list remote's endpoint — which provides that tag —
// refetches. That is the shared tag graph made visible.
function RefreshButton() {
  const dispatch = useDispatch();
  return (
    <Pressable
      onPress={() => dispatch(baseApi.util.invalidateTags(['PokemonList']))}
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
  // Screens load on demand; state modules load at boot. Importing partyApp/partySlice runs the
  // module that injects the party's reducer into the shared store — even if the user never opens
  // the Party tab. The host triggers the load and knows nothing about what is inside.
  //
  // Loading at boot is a head start, not a guarantee: the chunk arrives over the network, and
  // nothing here stops a user reaching an Add button before it lands. So the resolve is made
  // visible. rootReducer.inject() swaps an entry in a reducer map and rebuilds the combined
  // reducer; it never dispatches, so the store's state gains no `party` key until the next
  // action runs. partyStateReady is that action: dispatching it surfaces the injected slice,
  // and write-side consumers gate the add on `state.party` existing. Until then the button is
  // disabled; a tap can never dispatch into a store with no reducer for it.
  //
  // It belongs in an effect rather than at module scope: there the import's side effects can
  // resolve mid-way through React's first mount, which React reports as a state update on a
  // component that has not mounted. An effect runs after the first commit, where a side effect
  // belongs.
  //
  // Fire-and-forget: nothing awaits this, so an unreachable party server cannot block boot — the
  // federation runtime reports the failure on its own and the app runs without the slice, which
  // is the state the tolerant read shape exists for: reads render honestly, and the add stays
  // disabled rather than pretending. The catch guards the rejection path so a failed load can
  // never surface as an unhandled rejection.
  useEffect(() => {
    import('partyApp/partySlice')
      .then(() => store.dispatch(partyStateReady()))
      .catch(err => console.warn('party state module failed to load', err));
  }, []);

  return (
    <Provider store={store}>
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
    </Provider>
  );
}

const styles = StyleSheet.create({
  loader: { flex: 1 },
  refresh: { paddingHorizontal: 16, paddingVertical: 4 },
  refreshText: { color: '#2a75bb', fontSize: 16, fontWeight: '600' },
});
