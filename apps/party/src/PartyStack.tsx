// Federation loads this exposed module, never this app's own entry, so the global.css import
// in index.js is not in the graph the host pulls. Importing it here too is what keeps the
// styles working federated: without it the build works standalone and silently no-ops in
// the host, because this remote's classes never reach the shared styling runtime.
import '../global.css';

import React from 'react';
import { Pressable, Text } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { PokemonDetailView } from '@pokedex/detail';
import { useGetPokemonDetailQuery } from './detailApi';
import type { DetailParams } from '@pokedex/contracts';
import { Box, ThemeToggle } from '@pokedex/ui';
import type { PartyParamList } from './routes';
import PartyScreen from './PartyScreen';

// The same container shape the list app wrote, feeding the same installed view from this app's own
// endpoint. What it does NOT pass is the point: no onAddToParty, so a detail opened from the party
// shows no Add button. The view renders what its consumer wires, and this consumer wires no write.
function PokemonDetailRoute({
  route,
  navigation,
}: {
  route: { params: DetailParams };
  navigation: { goBack: () => void };
}) {
  const { data, isLoading, isError, refetch } = useGetPokemonDetailQuery(route.params.id);
  return (
    <Box className="flex-1">
      <PokemonDetailView pokemon={data} loading={isLoading} error={isError} onRetry={refetch} />
      <Pressable
        onPress={() => navigation.goBack()}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel="Close details"
        style={{
          position: 'absolute',
          top: 14,
          left: 16,
          height: 36,
          width: 36,
          borderRadius: 18,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(255,255,255,0.8)',
          boxShadow: '0 1px 4px rgba(0,0,0,0.18)',
        }}>
        <Text style={{ fontSize: 17, fontWeight: '600', color: '#515151' }}>✕</Text>
      </Pressable>
    </Box>
  );
}

const Stack = createNativeStackNavigator<PartyParamList>();

// The party tab's stack. The detail route was declared and typed two posts before anything pushed
// it; now tapping a party member does.
export default function PartyStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="PartyMain"
        component={PartyScreen}
        // Same chrome pattern as the Pokédex tab: this stack's own native large title, with
        // the design system's theme control in the right slot.
        options={{
          headerShown: true,
          title: 'Party',
          headerLargeTitle: true,
          headerLargeTitleStyle: { fontFamily: 'Nunito-ExtraBold' },
          headerTitleStyle: { fontFamily: 'Nunito-Bold' },
          headerRight: () => <ThemeToggle />,
        }}
      />
      <Stack.Screen
        name="PokemonDetail"
        component={PokemonDetailRoute}
        // Same modal shape as the list's detail: separate view controller over the shell, no
        // nav header (iOS paints a scroll-edge fade under a transparent one), the container
        // overlays the close control.
        options={{ headerShown: false, presentation: 'modal' }}
      />
    </Stack.Navigator>
  );
}
