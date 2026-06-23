# React Native Module Federation

Companion code for the blog series **[React Native Module Federation](https://warrendeleon.com/blog/series/react-native-module-federation/)**. The series builds a federated React Native app from zero, one post at a time, with Re.Pack and Module Federation 2.0.

Each post has a matching git tag holding that post's finished state, so you can clone the repo, check out the tag for the post you're reading, and run exactly what the post builds.

## Posts and tags

| Tag | Post | What it builds |
|---|---|---|
| `post-02-first-remote` | Your first federated remote | A host that loads one screen from a separate remote app at runtime |
| `post-03-shared-singleton` | The shared-singleton contract | Host and remote share a single copy of `react-native-safe-area-context`, so the remote reads the host's safe-area insets instead of bundling its own native module |
| `post-04-host-shell` | The host shell: federated remotes as tabs | The host owns a bottom-tab navigator; each tab is a federated remote loaded at runtime — a Pokédex list and a Trainer profile |

The first post, *Why Module Federation in React Native*, is concept only and ships no code, so it has no tag. `main` tracks the latest post; more tags land as the series grows.

## Layout

```
apps/
├── host/      the shell app; owns navigation, loads remotes at runtime
├── list/      a federated remote; exposes the Pokédex screen
└── profile/   a federated remote; exposes the Trainer screen
```

## Quick start

Requirements: Node 18+, Xcode with an iOS simulator, Ruby + Bundler, CocoaPods.

```sh
git clone https://github.com/warrendeleon/react-native-module-federation
cd react-native-module-federation
# main is the latest post. To follow an earlier post, check out its tag first, e.g.
#   git checkout post-02-first-remote

# install JS deps
( cd apps/list && npm install )
( cd apps/profile && npm install )
( cd apps/host && npm install )

# install iOS pods for the host
( cd apps/host/ios && bundle install && bundle exec pod install )
```

Then, in four terminals:

```sh
# 1. the list remote's dev server
cd apps/list && npm run start:remote      # :8082

# 2. the profile remote's dev server
cd apps/profile && npm run start:remote   # :8083

# 3. the host's dev server
cd apps/host && npm start                 # :8081

# 4. build and launch the host on a simulator
cd apps/host && npm run ios
```

The host boots into a bottom tab bar. Opening the **Pokédex** tab fetches the `list` remote from `:8082`; opening the **Trainer** tab fetches the `profile` remote from `:8083`. Each tab shows a spinner the first time while its remote downloads.
