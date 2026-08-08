import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as Repack from '@callstack/repack';
import pkg from './package.json' with { type: 'json' };
// The installed versions of the two React Navigation packages, read by hand. The bundler cannot
// work them out on its own: see the `version` note in the shared block below.
import navPkg from '@react-navigation/native/package.json' with { type: 'json' };
import navStackPkg from '@react-navigation/native-stack/package.json' with { type: 'json' };
import queryPkg from '@tanstack/react-query/package.json' with { type: 'json' };
import zustandPkg from 'zustand/package.json' with { type: 'json' };

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// listApp: a federated remote. What it exposes has changed: a whole stack (./ListStack) rather
// than one screen. Three more shared singletons appear below, because the share map tracks who
// imports what and this app now imports React Navigation. The detail screen it pushes is an
// installed package, so it needs nothing federated here.
export default Repack.defineRspackConfig(env => {
  const { mode, platform } = env;

  return {
    mode,
    context: __dirname,
    entry: './src/index.js',
    resolve: {
      // enablePackageExports lets the resolver read each package's `exports` map, which the
      // Module Federation runtime needs for subpath imports like '@module-federation/runtime/helpers'.
      ...Repack.getResolveOptions({ enablePackageExports: true }),
    },
    output: {
      path: `${__dirname}/build/[platform]`,
      uniqueName: 'ListApp',
    },
    module: {
      rules: [
        {
          test: /\.[cm]?[jt]sx?$/,
          type: 'javascript/auto',
          use: { loader: '@callstack/repack/babel-swc-loader', parallel: true, options: {} },
        },
        ...Repack.getAssetTransformRules(),
      ],
    },
    plugins: [
      new Repack.RepackPlugin({
        extraChunks: [
          { include: /.*/, type: 'remote', outputPath: `build/${platform}/remote` },
        ],
      }),
      new Repack.plugins.ModuleFederationPluginV2({
        name: 'listApp',
        filename: 'listApp.container.js.bundle',
        exposes: {
          './ListStack': './src/ListStack.tsx',
        },
        dts: false,
        shared: {
          react: { singleton: true, requiredVersion: pkg.dependencies.react },
          'react-native': {
            singleton: true,
            requiredVersion: pkg.dependencies['react-native'],
          },
          'react-native-safe-area-context': {
            singleton: true,
            requiredVersion: pkg.dependencies['react-native-safe-area-context'],
          },
          // New in this post. useNavigation reads a React context the host's NavigationContainer
          // fills, so the two apps have to be holding the same copy of the library that defines it.
          //
          // Both entries state `version` by hand, and nothing else in this file does. Rspack reads
          // the version out of the package it is sharing, but it cannot for a package resolved
          // through an `exports` map, and both of these have one. Leave it out and the provide is
          // skipped without a word: this app quietly bundles its own copy instead of taking the
          // host's, which is the duplicate-singleton problem from post 3 arriving with no error
          // message at all.
          '@react-navigation/native': {
            singleton: true,
            version: navPkg.version,
            requiredVersion: pkg.dependencies['@react-navigation/native'],
          },
          '@react-navigation/native-stack': {
            singleton: true,
            version: navStackPkg.version,
            requiredVersion: pkg.dependencies['@react-navigation/native-stack'],
          },
          // Post 4 left this out on the grounds that no remote imported it. That is no longer true:
          // native-stack renders its screens through it.
          'react-native-screens': {
            singleton: true,
            requiredVersion: pkg.dependencies['react-native-screens'],
          },
          // The state trio, mirroring the host's map without `eager`: the host provides the copies,
          // this remote consumes them. Both new packages resolve through an `exports` map, so they
          // state `version` by hand like the navigation entries above.
          '@tanstack/react-query': {
            singleton: true,
            version: queryPkg.version,
            requiredVersion: pkg.dependencies['@tanstack/react-query'],
          },
          zustand: {
            singleton: true,
            version: zustandPkg.version,
            requiredVersion: pkg.dependencies.zustand,
          },
          '@pokedex/contracts': {
            singleton: true,
            requiredVersion: pkg.dependencies['@pokedex/contracts'],
          },
        },
      }),
    ],
  };
});
