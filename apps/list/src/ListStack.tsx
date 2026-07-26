import React, { Suspense } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { PokemonDetailScreenProps } from '@pokedex/contracts';
import type { ListParamList } from './routes';
import PokedexScreen from './PokedexScreen';

// The detail screen lives in a third remote, and this remote loads it. From here that is an
// ordinary lazy import: Module Federation resolves detailApp from this app's own remotes map, the
// way the host resolves listApp from its own. The host is not involved and never mentions detailApp.
const PokemonDetailScreen = React.lazy(() => import('detailApp/PokemonDetailScreen'));

const Stack = createNativeStackNavigator<ListParamList>();

// The detail downloads the first time a row is tapped, so it renders behind a Suspense boundary,
// the same shape the host uses for its tabs. The props pass straight through: the navigator hands
// this component a route, and the remote screen reads its params.
function DetailRoute(props: PokemonDetailScreenProps) {
  return (
    <Suspense fallback={<ActivityIndicator style={styles.loader} size="large" />}>
      <PokemonDetailScreen {...props} />
    </Suspense>
  );
}

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
        component={DetailRoute}
        options={{ headerShown: true, title: '' }}
      />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  loader: { flex: 1 },
});
