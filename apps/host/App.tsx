import React, { Suspense } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider, useDispatch } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { baseApi } from '@pokedex/contracts';

import { store } from './src/store';

// The host owns the shell: the Redux store, the SafeAreaProvider, the navigation container, and the
// tab bar. Each tab's content is a federated remote loaded at runtime. The remotes know nothing about
// navigation or the store's wiring; they render screens the host arranges into tabs and read the one
// shared cache the host provides.
const PokedexScreen = React.lazy(() => import('listApp/PokedexScreen'));
const ProfileScreen = React.lazy(() => import('profileApp/ProfileScreen'));

// The host owns navigation, so it owns what a selection means. The list remote reports an id through
// the onSelectPokemon prop typed in @pokedex/contracts; for now the host just logs it, and a later
// post wires it to a detail route. Pass a wrong-shaped handler here and TypeScript stops the build.
function handleSelectPokemon(id: number) {
  console.log(`Selected Pokémon #${id}`);
}

// A host-owned control in host-owned chrome. It never imported getPokemonList and holds no reference
// to it, yet dispatching invalidateTags(['PokemonList']) reaches across the seam: the tag is the only
// thing that crosses, and the list remote's endpoint — which provides that tag — refetches. That is
// the shared tag graph made visible.
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

// A remote downloads the first time its tab is opened, so each tab renders behind a Suspense spinner.
// The Pokédex tab passes a prop, so it gets its own wrapper rather than a prop-less generic one.
function PokedexTab() {
  return (
    <Suspense fallback={<ActivityIndicator style={styles.loader} size="large" />}>
      <PokedexScreen onSelectPokemon={handleSelectPokemon} />
    </Suspense>
  );
}

function ProfileTab() {
  return (
    <Suspense fallback={<ActivityIndicator style={styles.loader} size="large" />}>
      <ProfileScreen />
    </Suspense>
  );
}

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <NavigationContainer>
          <Tab.Navigator screenOptions={{ headerShown: false }}>
            <Tab.Screen
              name="Pokédex"
              component={PokedexTab}
              options={{ headerShown: true, headerRight: () => <RefreshButton /> }}
            />
            <Tab.Screen name="Trainer" component={ProfileTab} />
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
