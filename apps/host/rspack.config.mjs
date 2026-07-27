import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as Repack from '@callstack/repack';
import pkg from './package.json' with { type: 'json' };
// Read the installed versions rather than letting the bundler work them out. It cannot for a
// package resolved through an `exports` map: see the `version` note in the shared block below.
import navPkg from '@react-navigation/native/package.json' with { type: 'json' };
import rtkPkg from '@reduxjs/toolkit/package.json' with { type: 'json' };
import reactReduxPkg from 'react-redux/package.json' with { type: 'json' };

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// host: the shell app. It consumes the listApp and partyApp remotes at runtime from their own dev
// servers. react and react-native are shared as EAGER singletons: the host is the one copy every
// remote renders against, and `eager` makes the share scope ready before this synchronous entry
// runs, so no async bootstrap file is needed.
//
// The navigation libraries join them in this post. Post 4 kept them out on the grounds that no
// remote imported them; both remotes now do, so the same rule points the other way. The share map
// is not a list of the host's dependencies — it is a record of what more than one party imports.
//
// detailApp is deliberately absent from `remotes` below. The host never loads it.
export default Repack.defineRspackConfig(env => {
  const { mode, platform } = env;

  return {
    mode,
    context: __dirname,
    entry: './index.js',
    resolve: {
      // Needed so the Module Federation runtime can resolve subpath imports like
      // '@module-federation/runtime/helpers'.
      ...Repack.getResolveOptions({ enablePackageExports: true }),
    },
    output: {
      path: `${__dirname}/build/[platform]`,
      uniqueName: 'Host',
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
      new Repack.RepackPlugin(),
      new Repack.plugins.ModuleFederationPluginV2({
        name: 'host',
        filename: 'host.container.js.bundle',
        remotes: {
          // name@url: the host knows each remote by the manifest URL it lives at. In dev those are
          // the remotes' own dev servers, list on :8082 and party on :8083.
          listApp: `listApp@http://localhost:8082/${platform}/mf-manifest.json`,
          partyApp: `partyApp@http://localhost:8083/${platform}/mf-manifest.json`,
        },
        dts: false,
        shared: {
          react: {
            singleton: true,
            eager: true,
            requiredVersion: pkg.dependencies.react,
          },
          'react-native': {
            singleton: true,
            eager: true,
            requiredVersion: pkg.dependencies['react-native'],
          },
          'react-native-safe-area-context': {
            singleton: true,
            eager: true,
            requiredVersion: pkg.dependencies['react-native-safe-area-context'],
          },
          '@react-navigation/native': {
            singleton: true,
            eager: true,
            // `version` is stated by hand here and nowhere else in this file. Rspack normally reads
            // the version out of the package it is sharing, but it cannot for a package resolved
            // through an `exports` map, and React Navigation has one. Without it the bundler
            // silently skips the provide: nothing lands in the share scope, and the app dies at
            // launch on RUNTIME-006.
            version: navPkg.version,
            requiredVersion: pkg.dependencies['@react-navigation/native'],
          },
          'react-native-screens': {
            singleton: true,
            eager: true,
            requiredVersion: pkg.dependencies['react-native-screens'],
          },
          // The state trio. @reduxjs/toolkit and react-redux must be one instance so injected
          // endpoints and hooks talk to the same store; @pokedex/contracts must be one instance so
          // every side imports the exact same baseApi — one cache, one tag graph. Both Redux
          // packages resolve through an `exports` map, so they state `version` by hand for the
          // same reason @react-navigation/native does above.
          '@reduxjs/toolkit': {
            singleton: true,
            eager: true,
            version: rtkPkg.version,
            requiredVersion: pkg.dependencies['@reduxjs/toolkit'],
          },
          'react-redux': {
            singleton: true,
            eager: true,
            version: reactReduxPkg.version,
            requiredVersion: pkg.dependencies['react-redux'],
          },
          '@pokedex/contracts': {
            singleton: true,
            eager: true,
            requiredVersion: pkg.dependencies['@pokedex/contracts'],
          },
        },
      }),
    ],
  };
});
