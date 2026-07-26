# React Native Module Federation

Companion code for the blog series **[React Native Module Federation](https://warrendeleon.com/blog/)**. The series builds a federated React Native app from zero, one post at a time, with Re.Pack and Module Federation 2.0.

Each post has a matching git tag holding that post's finished state, so you can clone the repo, check out the tag for the post you're reading, and run exactly what the post builds.

## Posts and tags

| Tag | Post | What it builds |
|---|---|---|
| `post-02-first-remote` | Your first federated remote | A host app that loads a screen from a separate remote app at runtime |
| `post-03-shared-singleton` | The shared-singleton contract | react, react-native and the safe-area library shared as singletons, so one copy serves every app |
| `post-04-host-shell` | The host shell: federated remotes as tabs | The host owns a bottom tab bar; a second remote fills the second tab, fetched the first time you open it |
| `post-05-contracts` | The contract package | Each tab grows its own stack, a third remote is loaded by the other two, and a published package types what they pass each other |

`main` tracks the latest post. More tags land as the series grows.

## Layout

```
apps/
├── host/     the shell app; owns the tab bar and loads the two stack remotes
├── list/     a federated remote; exposes the Pokédex stack, loads the detail remote
├── party/    a federated remote; exposes the Party stack, loads the detail remote
└── detail/   a federated remote; exposes the Pokémon detail screen
packages/
└── contracts/  @pokedex/contracts — the route params and module types, published to a registry
```

## Quick start

Requirements: Node 22.11+, Xcode with an iOS simulator, Ruby + Bundler, CocoaPods.

```sh
git clone https://github.com/warrendeleon/react-native-module-federation
cd react-native-module-federation
git checkout post-05-contracts
```

The apps install `@pokedex/contracts` from a local registry, so publish it before installing them. Leave the registry running in its own terminal:

```sh
npx verdaccio                                    # :4873, stays up
npm adduser --registry http://localhost:4873     # any username, password and email
( cd packages/contracts && npm install && npm run build && npm publish )
```

Then the apps:

```sh
( cd apps/list && npm install )
( cd apps/party && npm install )
( cd apps/detail && npm install )
( cd apps/host && npm install )

# install iOS pods for the host
( cd apps/host/ios && bundle install && bundle exec pod install )
```

Then, in five terminals:

```sh
# 1. the list remote's dev server
cd apps/list && npm run start:remote      # :8082

# 2. the party remote's dev server
cd apps/party && npm run start:remote     # :8083

# 3. the detail remote's dev server
cd apps/detail && npm run start:remote    # :8084

# 4. the host's dev server
cd apps/host && npm start                 # :8081

# 5. build and launch the host on a simulator
cd apps/host && npm run ios
```

The host boots on the Pokédex tab and fetches the `list` remote from `:8082`. Tap a row and the `detail` remote arrives from `:8084` — requested by the list remote, not by the host, and pushed inside the Pokédex tab so the tab bar stays on screen.

## Architecture

```mermaid
flowchart TD
    registry[("local registry :4873<br/>@pokedex/contracts")]
    subgraph host["host — the shell (:8081)"]
        tabs["bottom tab bar"]
        t1["Pokédex tab"]
        t2["Party tab"]
        tabs --> t1
        tabs --> t2
    end
    list[("list remote<br/>:8082 · ListStack")]
    party[("party remote<br/>:8083 · PartyStack")]
    detail[("detail remote<br/>:8084 · PokemonDetailScreen")]
    t1 -.->|"React.lazy · loaded at launch"| list
    t2 -.->|"React.lazy · loaded on first open"| party
    list -.->|"React.lazy · loaded on first row tap"| detail
    party -.->|"React.lazy"| detail
    registry -->|"installed by version"| host
    registry -->|"installed by version"| list
    registry -->|"installed by version"| party
    registry -->|"installed by version"| detail
```
