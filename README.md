# React Native Module Federation

Companion code for the blog series **[React Native Module Federation](https://warrendeleon.com/blog/)**. The series builds a federated React Native app from zero, one post at a time, with Re.Pack and Module Federation 2.0.

Each post has a matching git tag holding that post's finished state, so you can clone the repo, check out the tag for the post you're reading, and run exactly what the post builds.

## Posts and tags

| Tag | Post | What it builds |
|---|---|---|
| `post-02-first-remote` | Your first federated remote | A host app that loads a screen from a separate remote app at runtime |
| `post-03-shared-singleton` | The shared-singleton contract | react, react-native and the safe-area library shared as singletons, so one copy serves every app |
| `post-04-host-shell` | The host shell: federated remotes as tabs | The host owns a bottom tab bar; a second remote fills the second tab, fetched the first time you open it |
| `post-05-contracts` | The contract package | Each tab grows its own stack, the detail screen ships as a versioned package both stacks install, and a published contract types what they pass it |
| `post-06-shared-store` | One shared store | The contract package exports one RTK Query instance; the host builds a store around it and the Pokédex domain injects its live PokéAPI endpoints into the one shared cache |
| `post-08-client-state` | Client state across the seam | The party app injects its own slice into the shared store at runtime; the contract carries the one action that crosses; the detail view gains an optional Add button its consumers wire |
| `post-10-two-backends` | Two backends, one client? | A GraphQL endpoint joins the REST one in the same api slice via queryFn; both provide the same tag, so the host's one Refresh press refetches both protocols |
| `post-11-design-system` | The design system as a federated singleton | @pokedex/ui: gluestack-ui copy-in primitives, the token palette and the composed components, shared as a host-provided singleton; the detail completes its design as 4.0.0; one host toggle re-themes every bundle |

`main` tracks the latest post. More tags land as the series grows.

## Layout

```
apps/
├── host/     the shell app; owns the tab bar and loads the two stack remotes
├── list/     a federated remote; exposes the Pokédex stack
└── party/    a federated remote; exposes the Party stack
packages/
├── contracts/  @pokedex/contracts — the route params and module types, published to a registry
├── detail/     @pokedex/detail — the Pokémon detail view as a versioned component; presentational, fed by each consumer's own container
└── ui/         @pokedex/ui — the design system: gluestack-ui copy-in primitives, colour tokens and composed components, shared at runtime as a host-provided singleton
```

## Quick start

Requirements: Node 22.11+, Xcode with an iOS simulator, Ruby + Bundler, CocoaPods.

```sh
git clone https://github.com/warrendeleon/react-native-module-federation
cd react-native-module-federation
git checkout post-06-shared-store
```

The apps install `@pokedex/contracts` from a local registry, so publish it before installing them. Leave the registry running in its own terminal:

```sh
npx verdaccio                                    # :4873, stays up
npm adduser --registry http://localhost:4873     # any username, password and email
( cd packages/contracts && npm install && npm run build && npm publish )
( cd packages/detail && npm install && npm run build && npm publish )
```

Then the apps:

```sh
( cd apps/list && npm install )
( cd apps/party && npm install )
( cd apps/host && npm install )

# install iOS pods for the host
( cd apps/host/ios && bundle install && bundle exec pod install )
```

Then, in four terminals:

```sh
# 1. the list remote's dev server
cd apps/list && npm run start:remote      # :8082

# 2. the party remote's dev server
cd apps/party && npm run start:remote     # :8083

# 3. the host's dev server
cd apps/host && npm start                 # :8081

# 4. build and launch the host on a simulator
cd apps/host && npm run ios
```

The host boots on the Pokédex tab and fetches the `list` remote from `:8082`, which fills the shared store with the first 151 Pokémon from PokéAPI. Tap a row and the list's container fetches that Pokémon through the same store and feeds it to the view installed from `@pokedex/detail`, pushed inside the Pokédex tab so the tab bar stays on screen. Tap **Add to party** on a detail and the dispatch crosses the seam: the party app's slice — injected into the shared store at boot — catches it, the Pokédex header counter ticks, and the Party tab shows the member.

## Architecture

```mermaid
flowchart TD
    registry[("local registry :4873<br/>@pokedex/contracts · @pokedex/detail · @pokedex/ui")]
    pokeapi(["PokéAPI"])
    subgraph host["host — the shell (:8081)"]
        tabs["bottom tab bar"]
        store["Redux store<br/>reducer + baseApi from the contract"]
        t1["Pokédex tab"]
        t2["Party tab"]
        tabs --> t1
        tabs --> t2
    end
    list[("list remote<br/>:8082 · ListStack")]
    party[("party remote<br/>:8083 · PartyStack + partySlice")]
    t1 -.->|"React.lazy · loaded at launch"| list
    t2 -.->|"React.lazy · loaded on first open"| party
    host -.->|"boot import: partyApp/partySlice"| party
    list ==>|"injects getPokemonList + getPokemonDetail<br/>dispatches addToParty · reads the count"| store
    party ==>|"injects the party slice + its own getPokemonDetail"| store
    store <-->|"fetches through baseQuery"| pokeapi
    registry -->|"contracts + ui, installed by version"| host
    registry -->|"contracts + ui + the detail view"| list
    registry -->|"contracts + ui + the detail view"| party
```
