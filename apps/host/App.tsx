import React, { Suspense, useEffect, useState } from 'react';
import { Image, StyleSheet } from 'react-native';
import Animated, { FadeOut } from 'react-native-reanimated';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { colours, GluestackUIProvider, LoadingState, Toaster } from '@pokedex/ui';
import { partyStateReady } from '@pokedex/contracts';
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
// provider's mode is derived from NativeWind's colour-scheme observable — module-level state in
// the shared styling runtime, not state the host owns — which is what makes one toggle repaint
// three independently shipped bundles at once.
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

// The branded splash as the app's own first frame: the launch storyboard carries the same
// field and ball, but this overlay guarantees the mark shows on every runtime, then fades.
// Native code cannot arrive over the wire, and neither can this: the ball ships as a host
// asset. Two rules shape it:
//
//   - It hides on readiness, not on a stopwatch. `ready` flips when the navigation shell has
//     mounted; the timer is only a floor so the mark never strobes on a fast launch. A fixed
//     duration would tax every launch with the slowest one's wait.
//   - The field follows the colour scheme — the scheme surface in light, navy in dark — so the
//     fade lands on a surface of the same luminance instead of jumping navy-to-white.
function Splash({ ready, onDone }: { ready: boolean; onDone: () => void }) {
  const { colorScheme } = useColorScheme();
  const [minShown, setMinShown] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMinShown(true), 600);
    return () => clearTimeout(t);
  }, []);
  useEffect(() => {
    if (ready && minShown) {
      onDone();
    }
  }, [ready, minShown, onDone]);
  return (
    <Animated.View
      exiting={FadeOut.duration(350)}
      style={[
        StyleSheet.absoluteFill,
        splashStyles.field,
        { backgroundColor: colorScheme === 'dark' ? colours.navy : colours.offWhite },
      ]}>
      <Image
        source={require('./src/assets/splash-ball.png')}
        style={splashStyles.ball}
        resizeMode="contain"
      />
    </Animated.View>
  );
}

const splashStyles = StyleSheet.create({
  field: { alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  ball: { width: 128, height: 128 },
});

// The one Toaster in the runtime, floated clear of the tab bar. Remotes never mount this;
// they call toast() on the shared singleton and this instance shows it — the host owns the
// chrome, including the transient kind.
function ShellToaster() {
  const insets = useSafeAreaInsets();
  return <Toaster bottomOffset={insets.bottom + 49 + 12} />;
}

// The tab glyphs, defined once at module scope: an icon renderer created inside App would be a
// new component type on every render, and the navigator would tear the icon subtree down each
// time. Outline glyph tinted by the navigator when idle; the full-colour filled pokéball when
// the tab is selected, untinted so it keeps its own colours.
function TabIcon({
  focused,
  color,
  size,
  active,
  idle,
}: {
  focused: boolean;
  color: string;
  size: number;
  active: number;
  idle: number;
}) {
  return (
    <Image
      source={focused ? active : idle}
      style={{ width: size, height: size, ...(focused ? {} : { tintColor: color }) }}
      resizeMode="contain"
    />
  );
}

const POKEDEX_ACTIVE = require('./src/assets/tab-pokedex-active.png');
const POKEDEX_IDLE = require('./src/assets/tab-pokedex.png');
const PARTY_ACTIVE = require('./src/assets/tab-party-active.png');
const PARTY_IDLE = require('./src/assets/tab-party.png');

const renderPokedexTabIcon = (p: { focused: boolean; color: string; size: number }) => (
  <TabIcon {...p} active={POKEDEX_ACTIVE} idle={POKEDEX_IDLE} />
);
const renderPartyTabIcon = (p: { focused: boolean; color: string; size: number }) => (
  <TabIcon {...p} active={PARTY_ACTIVE} idle={PARTY_IDLE} />
);

const Tab = createBottomTabNavigator();

export default function App() {
  // One source of truth: the shared styling runtime's colour scheme. Earlier versions kept
  // host state beside it, and the navigation chrome (native, repainted on its own commit)
  // flipped almost half a second before the content's styling pass, which read as parts of
  // the app missing the theme change. Deriving the chrome from the same observable every
  // dark: class subscribes to puts every surface on the same update wave.
  const { colorScheme } = useColorScheme();
  const mode: 'light' | 'dark' = colorScheme === 'dark' ? 'dark' : 'light';

  // The navigation chrome reads the same NativeWind observable as the styling runtime:
  // headers and the tab bar are host-owned, so the host themes them, mapped to the design
  // system's tokens.
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

  const [splashDone, setSplashDone] = useState(false);
  const [navReady, setNavReady] = useState(false);

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
          <NavigationContainer theme={navTheme} onReady={() => setNavReady(true)}>
            <Tab.Navigator
              screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: colours.blue,
                tabBarLabelStyle: { fontFamily: 'Nunito-SemiBold' },
              }}>
              <Tab.Screen
                name="Pokédex"
                component={PokedexTab}
                options={{ tabBarIcon: renderPokedexTabIcon }}
              />
              <Tab.Screen
                name="Party"
                component={PartyTab}
                options={{ tabBarIcon: renderPartyTabIcon }}
              />
            </Tab.Navigator>
          </NavigationContainer>
          <ShellToaster />
          {/* The splash sits OUTSIDE the NavigationContainer: the remotes' native headers are
              UIKit views that draw above any zIndex inside the container, so an overlay inside
              it leaves the header's controls poking through the brand moment. As a later
              sibling of the whole container it covers everything. */}
          {splashDone ? null : <Splash ready={navReady} onDone={() => setSplashDone(true)} />}
        </GluestackUIProvider>
      </SafeAreaProvider>
    </Provider>
  );
}
