import React, { Suspense, useEffect } from 'react';
import { Image } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { partyStateReady } from '@pokedex/contracts';
import { colours, GluestackUIProvider, LoadingState } from '@pokedex/ui';
import { useColorScheme } from 'nativewind';

import { store } from './src/store';

// The host owns the shell: the Redux store, the SafeAreaProvider, the navigation container, and the
// tab bar. What it mounts in each tab is no longer a screen but a whole stack, so navigation inside
// a tab belongs to the remote that owns the tab. The host's job stops at the tab bar — and at the
// store: consumers read the one shared cache the host provides, but the host never sees their
// endpoints at build time.
//
// As of this post the host also owns the design system's runtime: GluestackUIProvider is mounted
// once, here, and every remote renders against it through the shared @pokedex/ui singleton. The
// provider's mode is host state, which is what makes the theme toggle below repaint three
// independently shipped bundles at once.
const ListStack = React.lazy(() => import('listApp/ListStack'));
const PartyStack = React.lazy(() => import('partyApp/PartyStack'));


// A remote downloads the first time its tab is opened, so each tab renders behind a Suspense
// spinner. Wrapping once here keeps the lazy boundary out of the remotes.
function withSuspense(Remote: React.ComponentType) {
  return function Tab() {
    return (
      <Suspense fallback={<LoadingState />}>
        <Remote />
      </Suspense>
    );
  };
}

const PokedexTab = withSuspense(ListStack);
const PartyTab = withSuspense(PartyStack);

const Tab = createBottomTabNavigator();

export default function App() {
  // One source of truth: the shared styling runtime's colour scheme. Earlier versions kept
  // host state beside it, and the navigation chrome (native, repainted on its own commit)
  // flipped almost half a second before the content's styling pass, which read as parts of
  // the app missing the theme change. Deriving the chrome from the same observable every
  // dark: class subscribes to puts every surface on the same update wave.
  const { colorScheme } = useColorScheme();
  const mode: 'light' | 'dark' = colorScheme === 'dark' ? 'dark' : 'light';

  // The navigation chrome rides the same host state as the styling runtime: headers and the
  // tab bar are host-owned, so the host themes them, mapped to the design system's tokens.
  // The remotes' own stack headers flip too, because @react-navigation/native is a shared
  // singleton and every navigator in the runtime reads this one container's theme.
  const navTheme =
    mode === 'dark'
      ? {
          ...DarkTheme,
          colors: {
            ...DarkTheme.colors,
            primary: colours.blue,
            background: colours.navy,
            card: colours.black,
            text: colours.white,
            border: colours.black,
          },
        }
      : { ...DefaultTheme, colors: { ...DefaultTheme.colors, primary: colours.blue } };

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
  // It sits in an effect rather than at module scope for an observed reason, not a traced one:
  // at module scope this import produced React's update-on-an-unmounted-component warning on
  // some cold starts, and in an effect it does not. What creates that update is not established
  // (inject() notifies nobody on its own), so this placement is the arrangement that made the
  // warning stop, and an effect is where a side effect belongs anyway.
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
        <GluestackUIProvider mode={mode}>
          <NavigationContainer theme={navTheme}>
            <Tab.Navigator
              screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: colours.blue,
                tabBarLabelStyle: { fontFamily: 'Nunito-SemiBold' },
              }}>
              <Tab.Screen
                name="Pokédex"
                component={PokedexTab}
                options={{
                  // Outline glyph tinted by the navigator when idle; the full-colour filled
                  // pokéball when the tab is selected, untinted so it keeps its own colours.
                  tabBarIcon: ({ focused, color, size }) => (
                    <Image
                      source={
                        focused
                          ? require('./src/assets/tab-pokedex-active.png')
                          : require('./src/assets/tab-pokedex.png')
                      }
                      style={{ width: size, height: size, ...(focused ? {} : { tintColor: color }) }}
                      resizeMode="contain"
                    />
                  ),
                }}
              />
              <Tab.Screen
                name="Party"
                component={PartyTab}
                options={{
                  tabBarIcon: ({ focused, color, size }) => (
                    <Image
                      source={
                        focused
                          ? require('./src/assets/tab-party-active.png')
                          : require('./src/assets/tab-party.png')
                      }
                      style={{ width: size, height: size, ...(focused ? {} : { tintColor: color }) }}
                      resizeMode="contain"
                    />
                  ),
                }}
              />
            </Tab.Navigator>
          </NavigationContainer>
        </GluestackUIProvider>
      </SafeAreaProvider>
    </Provider>
  );
}
