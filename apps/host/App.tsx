import React, { Suspense } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// `listApp/PokedexScreen` is not a package on disk. It is the `listApp` remote (see rspack.config.mjs
// `remotes`) and the `./PokedexScreen` it exposes. At runtime, Module Federation fetches the remote
// from its dev server, runs it, and returns the exposed component. React.lazy + Suspense show a
// spinner while that download happens.
const PokedexScreen = React.lazy(() => import('listApp/PokedexScreen'));

// The host owns the SafeAreaProvider: one provider, mounted once at the root, measuring the device's
// safe area. The remote reads those insets through useSafeAreaInsets. That only works if both apps
// resolve to the SAME copy of react-native-safe-area-context, which is what sharing it as a
// singleton guarantees (see rspack.config.mjs). Bundle two copies and the second one tries to
// register the library's native view again, which React Native rejects: the app crashes on launch.
export default function App() {
  return (
    <SafeAreaProvider>
      <Suspense fallback={<ActivityIndicator style={styles.loader} size="large" />}>
        <PokedexScreen />
      </Suspense>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loader: { flex: 1 },
});
