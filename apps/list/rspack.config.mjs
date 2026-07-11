import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as Repack from '@callstack/repack';
import pkg from './package.json' with { type: 'json' };

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// listApp: a federated remote. It has no native project of its own; it builds a container that a
// host loads at runtime, and exposes one screen (./PokedexScreen). react and react-native are
// declared shared so the remote renders against the host's single copy instead of bundling its
// own (two Reacts in one runtime would break hooks). The deep version of that contract is a later
// post; here it is the bare minimum to make a remote render inside a host.
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
          './PokedexScreen': './src/PokedexScreen.tsx',
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
          // The state trio, shared as singletons but NOT eager: the remote consumes the host's copies
          // from the share scope. It injects its endpoint into the host's baseApi, so both sides must
          // resolve to the one @reduxjs/toolkit, react-redux and @pokedex/contracts instance.
          '@reduxjs/toolkit': {
            singleton: true,
            requiredVersion: pkg.dependencies['@reduxjs/toolkit'],
          },
          'react-redux': {
            singleton: true,
            requiredVersion: pkg.dependencies['react-redux'],
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
