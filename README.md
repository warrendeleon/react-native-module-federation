# React Native Module Federation

Companion code for the blog series **[React Native Module Federation](https://warrendeleon.com/blog/)**. The series builds a federated React Native app from zero, one post at a time, with Re.Pack and Module Federation 2.0.

Each post has a matching git tag holding that post's finished state, so you can clone the repo, check out the tag for the post you're reading, and run exactly what the post builds.

## Posts and tags

| Tag | Post | What it builds |
|---|---|---|
| `post-02-first-remote` | Your first federated remote | A host app that loads a screen from a separate remote app at runtime |

`main` tracks the latest post. More tags land as the series grows.

## Layout

```
apps/
├── host/   the shell app; loads remotes at runtime
└── list/   a federated remote; exposes one screen
```

## Quick start

Requirements: Node 18+, Xcode with an iOS simulator, Ruby + Bundler, CocoaPods.

```sh
git clone https://github.com/warrendeleon/react-native-module-federation
cd react-native-module-federation
git checkout post-02-first-remote

# install JS deps
( cd apps/list && npm install )
( cd apps/host && npm install )

# install iOS pods for the host
( cd apps/host/ios && bundle install && bundle exec pod install )
```

Then, in three terminals:

```sh
# 1. the remote's dev server
cd apps/list && npm run start:remote     # :8082

# 2. the host's dev server
cd apps/host && npm start                # :8081

# 3. build and launch the host on a simulator
cd apps/host && npm run ios
```

The host boots, shows a spinner for a moment while it fetches the `list` remote from `:8082`, then renders the remote's Pokédex screen.

## The full reference

This repo stays deliberately small so each post is easy to follow. For the production-grade version, with a signed CDN, per-launch version resolution, an offline fallback, a shared design system, and health-based rollback, see **[pokedex-federation](https://github.com/warrendeleon/pokedex-federation)**.
