import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as Repack from '@callstack/repack';
import { DefinePlugin, SwcJsMinimizerRspackPlugin } from '@rspack/core';
import { NativeWindPlugin } from '@callstack/repack-plugin-nativewind';
import { ReanimatedPlugin } from '@callstack/repack-plugin-reanimated';
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

// --- Where the remotes are served from. Set MF_CDN_BASE and the host looks to the content
// delivery network instead of the dev servers; leave it unset and nothing changes. The value is
// read at BUILD time and baked into the bundle, so a build that forgot it ships the dev URLs:
//   MF_CDN_BASE=http://localhost:8000 npm start      (the local CDN, on a development build)
//   MF_CDN_BASE=https://cdn.example.com npm run …    (a real one, on a release build)
//
// What changed in this post is who uses the value. It still shapes the remotes map below, but
// that map is now a placeholder: the URLs it holds carry no version segment, so against a
// versioned CDN tree they resolve to nothing. The value that matters is the one handed to the
// running code through DefinePlugin, where src/shell/scriptManager.ts reads it, asks the CDN
// which versions this binary may run, and re-registers every remote at a versioned URL before
// the first import fires.
// Trailing slashes are trimmed, because every URL built from this value adds its own separator
// and a base written with one produces a double slash in the middle of every path. Most servers
// forgive that; a signature is cached against the URL that fetched it, so it is not worth finding
// out which ones do not.
const CDN_BASE = (process.env.MF_CDN_BASE || '').replace(/\/+$/, '');

// --- This binary's own version, the question it asks the CDN at launch. The CDN answers with the
// remote versions this binary is allowed to run, which is how a two-year-old install keeps
// working: it keeps being handed the versions it shipped against. A real app reads this from the
// version it was released under; here it is a variable, so one checkout can produce two binaries
// that ask different questions:
//   MF_APP_VERSION=1.0.0 npm run ios -- --mode Release
const APP_VERSION = process.env.MF_APP_VERSION || '1.0.0';

const DEV_REMOTES = {
  listApp: 'http://localhost:8082',
  partyApp: 'http://localhost:8083',
};

export default Repack.defineRspackConfig(env => {
  const { mode, platform } = env;

  // The build-time remotes map, in one function: dev server or CDN, same manifest filename either
  // way. In CDN mode what it produces is a placeholder and nothing loads from it — the versioned
  // URL the app really uses is decided at launch. It is left pointing somewhere plausible rather
  // than removed, because Module Federation wants a name and an entry for every remote declared
  // at build time, and because in dev mode this is still the whole story.
  const remoteUrl = name =>
    CDN_BASE
      ? `${name}@${CDN_BASE}/${platform}/${name}/mf-manifest.json`
      : `${name}@${DEV_REMOTES[name]}/${platform}/mf-manifest.json`;

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
      new Repack.RepackPlugin(),
      // Wires PostCSS + Tailwind processing of global.css and the SWC side of the className
      // transform into the Re.Pack build. Official Callstack integration, version-locked to
      // the installed @callstack/repack.
      new NativeWindPlugin(),
      // react-native-reanimated ships a Babel/SWC transform its worklets depend on. Re.Pack
      // detects the package and warns when the plugin is absent; the official Callstack plugin
      // wires that transform in, version-locked to the installed @callstack/repack.
      new ReanimatedPlugin(),
      // The two build-time facts the operational layer needs as literals in the bundle: where the
      // CDN is, and which version this binary is. An empty base is the signal that no CDN was
      // configured, which is what keeps a plain development build on the dev servers.
      new DefinePlugin({
        __MF_CDN_BASE__: JSON.stringify(CDN_BASE),
        __APP_VERSION__: JSON.stringify(APP_VERSION),
      }),
      new Repack.plugins.ModuleFederationPluginV2({
        name: 'host',
        filename: 'host.container.js.bundle',
        remotes: {
          // name@url: the host knows each remote by the manifest URL it lives at — the dev
          // servers on :8082 and :8083, or the CDN when MF_CDN_BASE is set.
          listApp: remoteUrl('listApp'),
          partyApp: remoteUrl('partyApp'),
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
          // The design system and its styling runtime, new in this post. Both pass the same
          // identity test the entries above passed: @pokedex/ui because every remote must render
          // against the one provider the host mounted, and nativewind because the compiled-style
          // registry and the colour scheme are module-level state inside the library — two copies
          // means remotes styling against a registry the host never reads. tailwindcss and
          // postcss stay out: build-time tooling never ships. @pokedex/detail stays out on
          // purpose — per-consumer versioning is its feature, and the skew ladder from post 5
          // still works after this post.
          '@pokedex/ui': {
            singleton: true,
            eager: true,
            requiredVersion: pkg.dependencies['@pokedex/ui'],
          },
          nativewind: {
            singleton: true,
            eager: true,
            requiredVersion: pkg.dependencies.nativewind,
          },
          // The animation runtime passes the same identity test: reanimated and its worklets
          // runtime register native views and a worklet runtime once per process, so a second
          // JS copy in a remote registers the same native name twice and the app dies at load.
          // One copy, provided here, consumed everywhere.
          'react-native-reanimated': {
            singleton: true,
            eager: true,
            requiredVersion: pkg.dependencies['react-native-reanimated'],
          },
          'react-native-worklets': {
            singleton: true,
            eager: true,
            requiredVersion: pkg.dependencies['react-native-worklets'],
          },
        },
      }),
    ],
  };
});
