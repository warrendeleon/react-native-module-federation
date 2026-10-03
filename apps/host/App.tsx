import React, { Suspense, useEffect, useState } from 'react';
import { Image, StyleSheet } from 'react-native';
import Animated, { FadeOut } from 'react-native-reanimated';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { colours, ErrorState, GluestackUIProvider, LoadingState, Toaster } from '@pokedex/ui';
import {
  type ListStackModule,
  partyStateReady,
  type PartyStackModule,
  registerShellNavigateHandler,
} from '@pokedex/contracts';
import { useColorScheme } from 'nativewind';

import { store } from './src/store';
import { FEDERATION_BANNER_HEIGHT, FederationBanner } from './src/shell/FederationBanner';
import type { FederationMode } from './src/shell/remoteLocator';
import {
  canFallBack,
  fallBackAndReload,
  forceReloadRemote,
  getFederationStatus,
  initializeFederation,
  loadRemoteModule,
} from './src/shell/scriptManager';
import { shellNavigateHandler } from './src/shell/shellNavigation';

// The host fills the contract's navigation slot once, at module scope, before any remote can
// render and call shellNavigate. Registering the handler touches no native code — the TurboModule
// is not reached until a destination is actually navigated to — so this is safe at import in a way
// that requiring the spec here would not be.

registerShellNavigateHandler(shellNavigateHandler);

// The host owns the shell: the Redux store, the SafeAreaProvider, the navigation container, and the
// tab bar. What it mounts in each tab is no longer a screen but a whole stack, so navigation inside
// a tab belongs to the remote that owns the tab. The host's job stops at the tab bar — and at the
// store: consumers read the one shared cache the host provides, but the host never sees their
// endpoints at build time.
//
// Since post 11 the host also owns the design system's runtime: GluestackUIProvider is mounted
// once, here, and every remote renders against it through the shared @pokedex/ui singleton. The
// provider's mode is derived from NativeWind's colour-scheme observable — module-level state in
// the shared styling runtime, not state the host owns — which is what makes one toggle repaint
// three independently shipped bundles at once.
// A tab's stack loads the first time the tab is opened, so each tab renders behind a Suspense
// spinner, inside its own boundary. One boundary per tab is what keeps a failure to that tab: a
// screen that throws while rendering takes down everything up to the nearest boundary, and without
// one React unmounts the whole app.
//
// The tab loads its stack with loadRemoteModule, where earlier posts wrote
// import('listApp/ListStack'). An import() of a remote compiles into a module of the host's own
// bundle, and the bundle keeps that module for the rest of the session once it has been asked for,
// a failed one included. After a failed load it keeps the empty module the failure left behind, and
// every later import() settles with that, even when the retry downloads the remote successfully.
// loadRemoteModule asks the runtime every time, which is what lets a retry retry, and it evaluates
// the module where one that throws as it loads fails the load instead of the app.
//
// The boundary is the second net. The first, in scriptManager.ts, catches a manifest that fails
// before any code loads. What reaches the boundary got past it, and it matters which way:
//
//   - the load failed: a container or chunk that did not arrive or did not verify, a manifest that
//     arrived broken, or a module that threw as it was evaluated. The remote never produced a
//     component. From the CDN, the remote drops to its copy in the binary and the tab loads it
//     behind the loading state, so the swap is invisible. Only a load with no copy left to try
//     shows the error state.
//   - the load returned a component, and the component threw as it rendered, on its first render
//     or a later one: the boundary records that the code arrived, not whether the screen was ever
//     shown. That code has run in this session, so the boundary keeps the version rather than swap
//     it for the copy. The tab shows the error state straight away, and Try again renders it
//     again, which recovers an error that does not repeat.
//
// Try again has to get past two caches. React.lazy keeps the promise it was given and the result it
// settled with, a rejection included, so the same lazy component can only ever fail again: a retry
// needs a new one, remounted under a new key. And after a failed load the federation runtime keeps
// its own record of the remote, which forceReloadRemote clears first.
//
// What the error state says depends on how the tab failed and where this launch loads remotes
// from. In dev mode the likely cause is a dev server that is not running. From the CDN there is
// no dev server: the version could not be downloaded, its signature did not verify, or its code
// failed as it started, and the boundary cannot tell which, so the message names all three. A
// relaunch is worth trying because it asks the CDN for the version map again. Running from the
// copies, the CDN could not be used at launch and a relaunch asks again. With neither the CDN's
// versions nor a copy that could be registered, there is nothing to load, and only a relaunch asks
// again.
const LOAD_FAILURE_MESSAGE: Record<FederationMode, string> = {
  dev: 'The remote did not answer. Check its dev server, then try again.',
  cdn: 'The remote could not be downloaded, verified or started. Try again, or relaunch the app.',
  bundled: "The app's own copy of this remote could not be loaded. Relaunch the app.",
  unresolved: 'The app could not prepare this remote to load. Relaunch the app.',
};

const RENDER_FAILURE_MESSAGE = 'It loaded, then hit an error. Try again.';

type RemoteModule = { default?: unknown };

// What React can render as a component: a function or a class, or an object React made from one
// with memo, forwardRef or lazy, which it marks with that type's $$typeof symbol. A React element
// carries $$typeof too, and it is not a component, so the symbol itself is checked rather than its
// presence. Checked before React sees the module, so a remote that settles without a component
// fails here, under its own name, as a failed load, rather than as React's "Element type is
// invalid" once the load has counted as a success.
const COMPONENT_TYPES = new Set<unknown>([
  Symbol.for('react.memo'),
  Symbol.for('react.forward_ref'),
  Symbol.for('react.lazy'),
]);

function isComponent(value: unknown): value is React.ComponentType {
  return (
    typeof value === 'function' ||
    (typeof value === 'object' &&
      value !== null &&
      COMPONENT_TYPES.has((value as { $$typeof?: unknown }).$$typeof))
  );
}

export class RemoteBoundary extends React.Component<
  { remote: string; load: () => Promise<RemoteModule | null | undefined> },
  { failed: boolean; attempt: number }
> {
  state = { failed: false, attempt: 0 };
  lazyFor: React.LazyExoticComponent<React.ComponentType> | null = null;
  lazyAttempt = -1;
  // The last attempt whose load arrived with a component in it. A failure in an attempt that got
  // that far was thrown by the remote's own code, not by its load.
  loadedAttempt = -1;

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.warn(`${this.props.remote} failed`, error);
    if (this.dropsToCopy()) {
      fallBackAndReload(this.props.remote);
      this.nextAttempt();
    }
  }

  retry = () => {
    // A remote whose code loaded is rendered again as it is; one whose load failed is cleared
    // first, or the runtime would hand the same failure back.
    if (!this.loaded()) {
      forceReloadRemote(this.props.remote);
    }
    this.nextAttempt();
  };

  loaded() {
    return this.loadedAttempt === this.state.attempt;
  }

  // A failure the copy in the binary can answer: the load failed, so the remote never produced a
  // component, and this remote has a copy it has not dropped to yet.
  dropsToCopy() {
    return !this.loaded() && canFallBack(this.props.remote);
  }

  nextAttempt() {
    this.setState(({ attempt }) => ({ failed: false, attempt: attempt + 1 }));
  }

  render() {
    const { remote, load } = this.props;
    if (this.state.failed) {
      // Rendered once between the catch and componentDidCatch, where the swap has been decided but
      // has not run yet, so the error state never flashes up before an invisible reload.
      if (this.dropsToCopy()) {
        return <LoadingState />;
      }
      const loaded = this.loaded();
      return (
        <ErrorState
          title={loaded ? 'This tab stopped working' : 'This tab could not load'}
          message={loaded ? RENDER_FAILURE_MESSAGE : LOAD_FAILURE_MESSAGE[getFederationStatus().mode]}
          onRetry={this.retry}
          retryLabel="Try again"
        />
      );
    }
    // Keyed by attempt: a new key discards the lazy component whose rejection React cached and
    // starts a fresh load. The lazy component itself is kept per attempt, because a fresh one on
    // every render would remount the tab each time the shell re-renders.
    if (!this.lazyFor || this.lazyAttempt !== this.state.attempt) {
      const attempt = this.state.attempt;
      this.lazyFor = React.lazy(async () => {
        const module = await load();
        const component = module?.default;
        if (!isComponent(component)) {
          throw new Error(`${remote} loaded without a component to render`);
        }
        this.loadedAttempt = attempt;
        return { default: component };
      });
      this.lazyAttempt = attempt;
    }
    const Remote = this.lazyFor;
    return (
      <Suspense key={this.state.attempt} fallback={<LoadingState />}>
        <Remote />
      </Suspense>
    );
  }
}

const PokedexTab = () => (
  <RemoteBoundary
    remote="listApp"
    load={() => loadRemoteModule<{ default: ListStackModule }>('listApp/ListStack')}
  />
);
const PartyTab = () => (
  <RemoteBoundary
    remote="partyApp"
    load={() => loadRemoteModule<{ default: PartyStackModule }>('partyApp/PartyStack')}
  />
);

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
  // Cleared of the tab bar, and of the federation banner now sitting above it.
  return <Toaster bottomOffset={insets.bottom + 49 + 12 + FEDERATION_BANNER_HEIGHT + 6} />;
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

// --- The navigation shell, mounted only once the boot gate has opened. Its tabs load their remotes
// through React.lazy and loadRemoteModule, so mounting it is what starts the first load: it
// must not happen before initializeFederation has decided where remotes come from and registered
// them there. ---
function Shell({
  navTheme,
  mode,
  onReady,
}: {
  navTheme: React.ComponentProps<typeof NavigationContainer>['theme'];
  mode: 'light' | 'dark';
  onReady: () => void;
}) {

  return (
    <NavigationContainer theme={navTheme} onReady={onReady}>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          // Both tab labels are 10pt, so both are held to 4.5:1 on the bar they sit on,
          // and the bar is colors.card: white in light, the near-black neutral in dark.
          //
          // Active: colours.blue is a fill and a large-text colour — 3.48:1 on the light bar
          // and 3.74:1 on the dark — so the readable pair is used instead.
          //
          // Inactive: react-navigation derives it as text mixed 50% into card when nothing
          // is set, which is #8E8E8F on white, 3.27:1. One tab is always unfocused, so that
          // pair is always on screen. It is stated here rather than inherited, and it is the
          // same darkGrey/lightGrey pair every other secondary line in the federation uses.
          tabBarActiveTintColor: mode === 'dark' ? colours.blueTextDark : colours.blueText,
          tabBarInactiveTintColor: mode === 'dark' ? colours.lightGrey : colours.darkGrey,
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
  );
}

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

  // --- The boot gate. Until the launch has decided where remotes load from there is nothing to
  // resolve a federated load against: the map decides which build of each remote this binary
  // may load, and a load that starts first would be resolved against the build-time placeholder
  // URLs. The probe has its own timeout; on Android the gate also waits for the copies to be
  // prepared. Both happen behind the splash, so a launch looks the way it always did.
  //
  // A failure is not a reason to hold the app back. The gate opens either way; what changes is
  // the mode the banner reports and whether the tabs can load anything at all. ---
  const [federationReady, setFederationReady] = useState(false);

  useEffect(() => {
    let live = true;
    initializeFederation()
      .catch(err => console.warn('federation initialisation failed', err))
      .then(() => {
        if (live) {
          setFederationReady(true);
        }
      });
    return () => {
      live = false;
    };
  }, []);

  // Screens load on demand; state modules load at boot — where boot now means the moment the
  // boot gate opens, because this is a federated load like any other. Loading
  // partyApp/partySlice runs the module that injects the party's reducer into the shared store,
  // even if the user never opens the Party tab. The host triggers the load and knows nothing
  // about what is inside.
  //
  // Loading at boot is a head start, not a guarantee: the chunk loads asynchronously, from a server
  // or from the copy in the binary, and nothing here stops a user reaching an Add button before it
  // lands. So the resolve is made visible. rootReducer.inject() swaps an entry in a reducer map and
  // rebuilds the combined reducer; it never dispatches, so the store's state gains no `party` key
  // until the next action runs. partyStateReady is that action: dispatching it surfaces the
  // injected slice, and write-side consumers gate the add on `state.party` existing. Until then the
  // button is disabled; a tap can never dispatch into a store with no reducer for it.
  //
  // It sits in an effect rather than at module scope for an observed reason, not a traced one:
  // at module scope this load produced React's update-on-an-unmounted-component warning on
  // some cold starts, and in an effect it does not. What creates that update is not established
  // (inject() notifies nobody on its own), so this placement is the arrangement that made the
  // warning stop, and an effect is where a side effect belongs anyway.
  //
  // Fire-and-forget: nothing awaits this, so a remote that cannot be reached cannot block boot. A
  // failed load rejects, and the catch logs it, so it never surfaces as an unhandled rejection.
  // The app then runs without the slice, which is the state the tolerant read shape exists for:
  // reads still render, and adding to the party stays disabled.
  useEffect(() => {
    if (!federationReady) {
      return;
    }
    loadRemoteModule('partyApp/styles').catch(err =>
      console.warn('party styles failed to load', err),
    );
    loadRemoteModule('partyApp/partySlice')
      .then(() => store.dispatch(partyStateReady()))
      .catch(err => console.warn('party state module failed to load', err));
  }, [federationReady]);

  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <GluestackUIProvider mode={mode}>
          {federationReady ? (
            <>
              <Shell navTheme={navTheme} mode={mode} onReady={() => setNavReady(true)} />
              <FederationBanner />
            </>
          ) : null}
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
