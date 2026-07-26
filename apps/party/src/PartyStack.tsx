import React, { Suspense } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { PokemonDetailScreenProps } from '@pokedex/contracts';
import type { PartyParamList } from './routes';
import PartyScreen from './PartyScreen';

// The same third remote the list stack loads, resolved through this app's own remotes map. Two
// consumers, one provider, and neither consumer knows about the other.
const PokemonDetailScreen = React.lazy(() => import('detailApp/PokemonDetailScreen'));

const Stack = createNativeStackNavigator<PartyParamList>();

function DetailRoute(props: PokemonDetailScreenProps) {
  return (
    <Suspense fallback={<ActivityIndicator style={styles.loader} size="large" />}>
      <PokemonDetailScreen {...props} />
    </Suspense>
  );
}

// The party tab's stack. The detail route is declared and typed but nothing pushes it yet: the
// party has no members to tap until it has state, which is post 7. It is here now because the
// contract is what this post is about, and both consumers of that contract should be visible.
export default function PartyStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="PartyMain"
        component={PartyScreen}
        options={{ title: 'Party' }}
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
