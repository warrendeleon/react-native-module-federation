import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as Repack from '@callstack/repack';
import pkg from './package.json' with { type: 'json' };

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// host: the shell app. It consumes the listApp and partyApp remotes at runtime from their own dev
// servers. react and react-native are shared as EAGER singletons: the host is the one copy every
// remote renders against, and `eager` makes the share scope ready before this synchronous entry
// runs, so no async bootstrap file is needed. React Navigation is NOT shared: no remote imports it,
// and a dependency nobody shares has no business in the share scope.
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
        },
      }),
    ],
  };
});
