import React, { Suspense } from 'react';
import { ActivityIndicator, SafeAreaView, StyleSheet } from 'react-native';

// `listApp/PokedexScreen` is not a package on disk. It is the `listApp` remote (see rspack.config.mjs
// `remotes`) and the `./PokedexScreen` it exposes. At runtime, Module Federation fetches the remote
// from its dev server, runs it, and returns the exposed component. React.lazy + Suspense show a
// spinner while that download happens.
const PokedexScreen = React.lazy(() => import('listApp/PokedexScreen'));

export default function App() {
  return (
    <SafeAreaView style={styles.root}>
      <Suspense fallback={<ActivityIndicator style={styles.loader} size="large" />}>
        <PokedexScreen />
      </Suspense>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  loader: { flex: 1 },
});
