import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as Repack from '@callstack/repack';
import pkg from './package.json' with { type: 'json' };

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// host: the shell app. It consumes the listApp remote at runtime from that remote's dev server.
// react and react-native are shared as EAGER singletons: the host is the one copy every remote
// renders against, and `eager` makes the share scope ready before this synchronous entry runs, so
// no async bootstrap file is needed.
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
          // the remotes' own dev servers, list on :8082 and profile on :8083.
          listApp: `listApp@http://localhost:8082/${platform}/mf-manifest.json`,
          profileApp: `profileApp@http://localhost:8083/${platform}/mf-manifest.json`,
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
          // The state trio, shared as eager singletons from the host. @reduxjs/toolkit and
          // react-redux must be one instance so a remote's injected endpoints and hooks talk to the
          // same store; @pokedex/contracts must be one instance so every side imports the exact same
          // baseApi — one cache, one tag graph. This is the first runtime-bearing shared package in
          // the series; the contract was types-only until now.
          '@reduxjs/toolkit': {
            singleton: true,
            eager: true,
            requiredVersion: pkg.dependencies['@reduxjs/toolkit'],
          },
          'react-redux': {
            singleton: true,
            eager: true,
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
