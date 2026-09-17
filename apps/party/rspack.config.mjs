import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as Repack from '@callstack/repack';
import { SwcJsMinimizerRspackPlugin } from '@rspack/core';
import { NativeWindPlugin } from '@callstack/repack-plugin-nativewind';
import { ReanimatedPlugin } from '@callstack/repack-plugin-reanimated';
import pkg from './package.json' with { type: 'json' };
// The installed versions of the exports-map packages, read by hand. The bundler cannot work them
// out on its own: see the `version` note in the shared block below.
import navPkg from '@react-navigation/native/package.json' with { type: 'json' };
import navStackPkg from '@react-navigation/native-stack/package.json' with { type: 'json' };
import rtkPkg from '@reduxjs/toolkit/package.json' with { type: 'json' };
import reactReduxPkg from 'react-redux/package.json' with { type: 'json' };

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// partyApp: the second federated remote. This config changes in the same two places listApp's did
// — exposes a stack, shares the navigation libraries — which is the point worth noticing: two apps
// owned by two teams arrive at the same shape because the contract they installed says so, not
// because they agreed.
export default Repack.defineRspackConfig(env => {
  const { mode, platform } = env;
  // Production builds write somewhere else and gain a signature; development is untouched.
  const isProd = mode === 'production';

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
      // A production build writes the tree the CDN serves, laid out as the URL path it is served
      // at: cdn/<platform>/partyApp/. A development build keeps writing to build/, where the dev
      // server reads it from.
      path: isProd ? `${__dirname}/cdn/[platform]/partyApp` : `${__dirname}/build/[platform]`,
      uniqueName: 'PartyApp',
    },
    optimization: {
      // Re.Pack's default minimiser is terser-webpack-plugin, and under Rspack that plugin has done
      // nothing since terser-webpack-plugin 5.6.0 (callstack/repack#1390): the build succeeds and
      // every production chunk ships with its comments and whitespace intact. Re.Pack merges this
      // array into its own, so the default still sits in the list beside Rspack's SWC minimiser;
      // the SWC one does the minifying the default skips.
      minimizer: [
        new SwcJsMinimizerRspackPlugin({
          test: /\.(js)?bundle(\?.*)?$/i,
          minimizerOptions: { format: { comments: false } },
        }),
      ],
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
          {
            include: /.*/,
            type: 'remote',
            // The chunks land beside the container and the manifest, because the host will ask
            // for them at URLs relative to the manifest it loaded.
            outputPath: isProd ? `cdn/${platform}/partyApp` : `build/${platform}/remote`,
          },
        ],
      }),
      // PostCSS + Tailwind processing of global.css and the className transform, same as
      // the host: a remote compiles its own classes, then registers them into the shared
      // styling runtime at load.
      new NativeWindPlugin(),
      // react-native-reanimated ships a Babel/SWC transform its worklets depend on. Re.Pack
      // detects the package and warns when the plugin is absent; the official Callstack plugin
      // wires that transform in, version-locked to the installed @callstack/repack.
      new ReanimatedPlugin(),
      new Repack.plugins.ModuleFederationPluginV2({
        name: 'partyApp',
        filename: 'partyApp.container.js.bundle',
        exposes: {
          './PartyStack': './src/PartyStack.tsx',
          // A state module, not a screen. The host imports it at boot for its side effect: running
          // it injects the party's reducer into the shared store.
          './partySlice': './src/partySlice.ts',
          './styles': './src/styles.ts',
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
          // copies, this remote consumes them. One RTK/react-redux instance so this app's slice
          // and hooks talk to the store the host wired; one @pokedex/contracts instance so
          // rootReducer, addToParty and baseApi are the exact objects every other side holds. The
          // Redux packages resolve through an `exports` map, so they state `version` by hand like
          // the navigation entries above.
          '@reduxjs/toolkit': {
            singleton: true,
            version: rtkPkg.version,
            requiredVersion: pkg.dependencies['@reduxjs/toolkit'],
          },
          'react-redux': {
            singleton: true,
            version: reactReduxPkg.version,
            requiredVersion: pkg.dependencies['react-redux'],
          },
          '@pokedex/contracts': {
            singleton: true,
            requiredVersion: pkg.dependencies['@pokedex/contracts'],
          },
          // The design system and its styling runtime, mirroring the host's map without eager:
          // the host provides the copies, this remote consumes them. nativewind is in because
          // its style registry and colour scheme are module-level singleton state; the detail
          // package stays out because per-consumer versioning is its feature.
          '@pokedex/ui': {
            singleton: true,
            requiredVersion: pkg.dependencies['@pokedex/ui'],
          },
          nativewind: {
            singleton: true,
            requiredVersion: pkg.dependencies.nativewind,
          },
          // The animation runtime, consumed from the host: native view registrations are global,
          // so a second copy here would register the same names twice.
          'react-native-reanimated': {
            singleton: true,
            requiredVersion: pkg.dependencies['react-native-reanimated'],
          },
          'react-native-worklets': {
            singleton: true,
            requiredVersion: pkg.dependencies['react-native-worklets'],
          },
        },
      }),
      // Each production chunk gets an RS256 signature of its own hash, appended to the file. The
      // private key sits in code-signing/, git-ignored inside the checkout, and never ships.
      // Development builds stay unsigned by choice: their chunks are served from this machine
      // and rebuilt on every save, and this post signs only what leaves it.
      ...(isProd
        ? [
            new Repack.plugins.CodeSigningPlugin({
              privateKeyPath: path.resolve(__dirname, '../../code-signing/private-key.pem'),
            }),
          ]
        : []),
    ],
  };
});
