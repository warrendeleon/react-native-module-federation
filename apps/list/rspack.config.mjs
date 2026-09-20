import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as Repack from '@callstack/repack';
import { DefinePlugin, SwcJsMinimizerRspackPlugin } from '@rspack/core';
import { NativeWindPlugin } from '@callstack/repack-plugin-nativewind';
import { ReanimatedPlugin } from '@callstack/repack-plugin-reanimated';
import pkg from './package.json' with { type: 'json' };
// The installed versions of the two React Navigation packages, read by hand. The bundler cannot
// work them out on its own: see the `version` note in the shared block below.
import navPkg from '@react-navigation/native/package.json' with { type: 'json' };
import navStackPkg from '@react-navigation/native-stack/package.json' with { type: 'json' };
import rtkPkg from '@reduxjs/toolkit/package.json' with { type: 'json' };
import reactReduxPkg from 'react-redux/package.json' with { type: 'json' };

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// listApp: a federated remote. What it exposes has changed: a whole stack (./ListStack) rather
// than one screen. Three more shared singletons appear below, because the share map tracks who
// imports what and this app now imports React Navigation. The detail screen it pushes is an
// installed package, so it needs nothing federated here.

// --- Which version of this remote the build produces. It decides two things at once: the
// directory the artefacts are written to, and the string the running code reports about itself.
// Both come from one variable, so a build cannot write 1.2.0's files and claim to be 1.1.0:
//   MF_REMOTE_VERSION=1.2.0 npm run bundle:ios:prod
// A version directory is written once and never edited afterwards. Rebuilding a version that
// installed apps are already loading replaces code those apps treat as fixed, which is the one
// move this layout exists to make unnecessary: ship a new version instead. ---
const REMOTE_VERSION = process.env.MF_REMOTE_VERSION || '1.0.0';
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
      // at: cdn/<platform>/listApp/<version>/. The version segment is what lets one CDN hold
      // several releases of this remote at once, each at its own URL. A development build keeps
      // writing to build/, where the dev server reads it from, and carries no version: there is
      // only ever one build there, and it is whatever was saved last.
      path: isProd
        ? `${__dirname}/cdn/[platform]/listApp/${REMOTE_VERSION}`
        : `${__dirname}/build/[platform]`,
      uniqueName: 'ListApp',
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
            // The chunks land beside the container and the manifest, inside the same version
            // directory, because the host will ask for them at URLs relative to the manifest it
            // loaded. Miss the version segment here and the manifest is versioned while its own
            // chunks are not, which resolves to a 404 on first import.
            outputPath: isProd
              ? `cdn/${platform}/listApp/${REMOTE_VERSION}`
              : `build/${platform}/remote`,
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
      // The version, compiled into the bundle as a literal so the running screen can print the
      // build it came from. In production it is read from the same constant the output path uses,
      // so the chip on screen and the directory on the CDN can never disagree. A development
      // build says 'dev' instead: it was never published anywhere, and a number on it would be a
      // version claim about a file that is rebuilt on every save.
      new DefinePlugin({
        __REMOTE_VERSION__: JSON.stringify(isProd ? REMOTE_VERSION : 'dev'),
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
          // this remote consumes them. The Redux packages resolve through an `exports` map, so they
          // state `version` by hand like the navigation entries above.
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
