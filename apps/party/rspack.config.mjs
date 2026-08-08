import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as Repack from '@callstack/repack';
import pkg from './package.json' with { type: 'json' };
// The installed versions of the exports-map packages, read by hand. The bundler cannot work them
// out on its own: see the `version` note in the shared block below.
import navPkg from '@react-navigation/native/package.json' with { type: 'json' };
import navStackPkg from '@react-navigation/native-stack/package.json' with { type: 'json' };
import queryPkg from '@tanstack/react-query/package.json' with { type: 'json' };
import zustandPkg from 'zustand/package.json' with { type: 'json' };

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// partyApp: the second federated remote. This config changes in the same two places listApp's did
// — exposes a stack, shares the navigation libraries — which is the point worth noticing: two apps
// owned by two teams arrive at the same shape because the contract they installed says so, not
// because they agreed.
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
      uniqueName: 'PartyApp',
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
        name: 'partyApp',
        filename: 'partyApp.container.js.bundle',
        exposes: {
          // One expose again. The state module this app used to publish is gone: there is no slice
          // to inject, because the store it would have injected into ships in the contract package
          // every side already installs.
          './PartyStack': './src/PartyStack.tsx',
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
          // Both React Navigation entries state `version` by hand, and nothing else in this file
          // does. Rspack reads the version out of the package it is sharing, but it cannot for a
          // package resolved through an `exports` map, and both of these have one. Leave it out and
          // the provide is skipped without a word: this app quietly bundles its own copy instead of
          // taking the host's, which is the duplicate-singleton bug post 3 opened with, arriving
          // this time with no error message at all.
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
          'react-native-screens': {
            singleton: true,
            requiredVersion: pkg.dependencies['react-native-screens'],
          },
          // The state trio, mirroring the host's map without `eager`: the host provides the
          // copies, this remote consumes them. One @tanstack/react-query instance so this app's
          // hooks find the client the host put in context; one zustand instance so every
          // subscriber is talking to the same store internals; one @pokedex/contracts instance so
          // queryClient and partyStore are the exact objects every other side holds. Both new
          // packages resolve through an `exports` map, so they state `version` by hand like the
          // navigation entries above.
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
