# React Native Module Federation

Companion code for the blog series **[React Native Module Federation](https://warrendeleon.com/blog/)**. The series builds a federated React Native app from zero, one post at a time, with Re.Pack and Module Federation 2.0.

Most posts have a matching git tag holding that post's finished state, so you can clone the repo, check out the tag for the post you're reading, and run exactly what the post builds. Tags exist where there is a build to run, so the essays carry a dash instead: post 1 opens the series and has no row in the table, and post 7 sits in place with no tag of its own.

## Posts and tags

| Tag | Post | What it builds |
|---|---|---|
| `post-02-first-remote` | [Your first federated remote](https://warrendeleon.com/blog/your-first-federated-remote-react-native/?utm_source=github&utm_medium=readme&utm_campaign=module-federation-first-remote) | A host app that loads a screen from a separate remote app at runtime |
| `post-03-shared-singleton` | [The shared-singleton contract](https://warrendeleon.com/blog/shared-singleton-contract-react-native/?utm_source=github&utm_medium=readme&utm_campaign=module-federation-shared-singleton) | react, react-native and the safe-area library shared as singletons, so one copy serves every app |
| `post-04-host-shell` | [The host shell: federated remotes as tabs](https://warrendeleon.com/blog/host-shell-federated-tabs-react-native/?utm_source=github&utm_medium=readme&utm_campaign=module-federation-host-shell) | The host owns a bottom tab bar; a second remote fills the second tab, fetched the first time you open it |
| `post-05-contracts` | [The contract package](https://warrendeleon.com/blog/typing-the-seam-between-remotes-react-native/?utm_source=github&utm_medium=readme&utm_campaign=module-federation-contracts) | Each tab grows its own stack, the detail screen ships as a versioned package both stacks install, and a published contract types what they pass it |
| `post-06-shared-store` | [One shared store](https://warrendeleon.com/blog/one-shared-store-across-remotes-react-native/?utm_source=github&utm_medium=readme&utm_campaign=module-federation-shared-store) | The contract package exports one RTK Query instance; the host builds a store around it and the Pokédex domain injects its live PokéAPI endpoints into the one shared cache |
| — | [Who owns what](https://warrendeleon.com/blog/who-owns-what-federated-react-native/?utm_source=github&utm_medium=readme&utm_campaign=module-federation-ownership) | No code: the ownership essay behind posts 4 to 6, argued once as five tests for where a boundary, a component and a data definition belong |
| `post-08-client-state` | [Client state across the seam](https://warrendeleon.com/blog/client-state-across-federated-remotes-react-native/?utm_source=github&utm_medium=readme&utm_campaign=module-federation-client-state) | The party app injects its own slice into the shared store at runtime; the contract carries the one action that crosses; the detail view gains an optional Add button its consumers wire |
| `post-09-tanstack-zustand` | [State stacks under federation](https://warrendeleon.com/blog/state-stacks-under-federation-react-native/?utm_source=github&utm_medium=readme&utm_campaign=module-federation-state-stacks) | The same app rebuilt on TanStack Query and Zustand, a fork off the post-08 line rather than the next step on it, so this tag never folds into `main` |
| `post-10-two-backends` | [Two backends, one client?](https://warrendeleon.com/blog/rtk-query-vs-apollo-react-native/?utm_source=github&utm_medium=readme&utm_campaign=module-federation-rtk-query-apollo) | A GraphQL endpoint joins the REST one in the same api slice via queryFn; both provide the same tag, so the host's one Refresh press refetches both protocols |
| `post-11-design-system` | [The design system as a federated singleton](https://warrendeleon.com/blog/federated-design-system-react-native/?utm_source=github&utm_medium=readme&utm_campaign=module-federation-design-system) | @pokedex/ui: gluestack-ui copy-in primitives, the token palette and the composed components, shared as a host-provided singleton; the detail completes its design as 4.0.2; one host toggle re-themes every bundle |
| `post-12-a11y-testing` | [Accessibility testing across federated remotes](https://warrendeleon.com/blog/accessibility-testing-federated-remotes-react-native/?utm_source=github&utm_medium=readme&utm_campaign=module-federation-a11y-testing) | @pokedex/a11y-testing: one Jest preset, WCAG helpers and a report, installed by both source packages and both remotes; the token matrix checks contrast at the design system, each team checks its own screens against the same bar, and the touch targets and status regions it found ship as ui 1.0.12 and detail 4.0.11, and the host takes the ui release alongside both remotes |
| `post-13-native-handoff` | [shell.navigateTo: native screens from a federated remote](https://warrendeleon.com/blog/native-handoff-federated-remotes-react-native/?utm_source=github&utm_medium=readme&utm_campaign=module-federation-native-handoff) | contracts 3.3.0 carries one routing table and one promise-returning `shellNavigate`; the host adds a TurboModule and presents a fully native Quick Battle in SwiftUI and Compose; the winner's uid comes back through the promise and lands in the party's own state, crossing no contract action |
| `post-14-production-build` | [The production build and the three modes](https://warrendeleon.com/blog/production-build-three-modes-react-native/?utm_source=github&utm_medium=readme&utm_campaign=module-federation-production-build) | Both remotes built for production and signed chunk by chunk, laid out as the directory a content delivery network serves; one environment variable moves the host between the dev servers and that CDN, and the release build of each platform runs with no dev server at all |
| `post-15-cdn-flip` | [CDN delivery: the version map, the resolver, and the live flip](https://warrendeleon.com/blog/cdn-version-resolution-react-native/?utm_source=github&utm_medium=readme&utm_campaign=module-federation-cdn-flip) | The CDN holds every published version of each remote; each released app version gets a map saying which of them it may load; the host fetches its own map at launch and resolves every chunk to a versioned, signature-verified URL. Then a new remote version reaches an installed app through one uploaded directory and one edited line, and is rolled back the same way |
| `post-16-fallbacks` | [Fallback for federated remotes: the copy in the binary and the net in the session](https://warrendeleon.com/blog/offline-fallback-federated-remotes-react-native/?utm_source=github&utm_medium=readme&utm_campaign=module-federation-fallbacks) | Every release build carries a signed copy of both remotes. With the CDN out of reach at launch the app runs from those copies; in a CDN launch, a remote that fails to load drops to its own copy while the other stays on the CDN. A tab that still fails shows its error state, and Try again loads the remote again rather than replaying the failure |
| `post-17-signing-rollback` | [The signed map and the app that rolls itself back](https://warrendeleon.com/blog/version-map-signing-react-native/?utm_source=github&utm_medium=readme&utm_campaign=module-federation-signing-rollback) | The version map is signed and carries a release counter: a map the app cannot verify, or one older than the last it accepted, is refused and the launch runs from the copies. And a version that keeps failing to load stops being tried: after two failed launches with no render from the CDN between them, the next sends that remote to its copy without asking the CDN, until a different version is published |

`main` tracks the latest post. This is the last one: the series is complete at `post-17-signing-rollback`.

## Dependency advisories

`npm audit fix` and the in-range bumps are applied at every tag: `@module-federation/enhanced` 2.9.0 and the `@react-native-community/cli` trio (core and both platform packages) at 20.2.0, validated by `scripts/federation-smoke.sh` and the full test suites. What remained up to `post-16-fallbacks` was a single upstream advisory pair on `image-size`, reached through Re.Pack throughout, through `@callstack/repack-plugin-nativewind` and `@callstack/repack-plugin-reanimated` from `post-11`, and at `post-02` to `post-05` through React Native's own Metro as well: those trees resolve Metro 0.84.4, and 0.84.5 is not reachable in them without moving off React Native 0.85.3, which the series pins. At `post-17-signing-rollback` npm reports more, all in the same position: `adm-zip`, `brace-expansion`, `braces`, `decode-uri-component`, `fast-uri`, `fastify`, `joi`, `js-yaml`, `qs` and `undici` beside `image-size`, reached through the React Native CLI, ESLint, Jest, Re.Pack, `@module-federation/enhanced`, Tailwind CSS, and React Navigation's `query-string`, and identical in the apps this post did not touch. `npm audit fix` declines to move them: the in-range bumps it proposes pull `react-native-reanimated` 4.7, which wants React Native 0.86. Three of the four `packages/` workspaces report some of the same ones, through their Jest and Metro tooling: `brace-expansion`, `braces` and `js-yaml` in `ui` and `detail`, and `brace-expansion` and `braces` in `a11y-testing`. `contracts` reports none. All of it except `decode-uri-component` is build-time tooling that runs on the developer's machine and ships nothing into the app bundle; `decode-uri-component` ships with React Navigation, through `query-string`, which uses it to parse deep-link paths. The fixes arrive with upstream releases of those tools rather than overrides handing them an API they were not built against.

## Layout

```
apps/
├── host/     the shell app; owns the tab bar and loads the two stack remotes
├── list/     a federated remote; exposes the Pokédex stack
└── party/    a federated remote; exposes the Party stack
tools/
├── gen-signing-keys.mjs  generates the RSA keypair that signs production chunks and the Ed25519 keypair that signs the version map, and writes the public halves where the host reads them (keys stay out of git)
├── gen-signing-keys.test.mjs  the generator's regression tests: node --test tools/gen-signing-keys.test.mjs
├── build-cdn.mjs         builds every published version of both remotes into cdn-root/, writes one signed version map per released app version, and stages the copy each release build carries in embed-root/
├── build-cdn.test.mjs    its regression tests, against stand-in remotes that write a bundle instead of compiling one: node --test tools/build-cdn.test.mjs
├── sign-version-map.mjs  signs one map already in cdn-root/ after it was edited by hand, with the release counter MF_RELEASE_SEQ gives it, which must be higher than every map's under cdn-root/
├── version-map-signing.mjs  the signing shared by build-cdn.mjs and sign-version-map.mjs: the canonical string, the counter, the key
└── version-map-signing.test.mjs  regression tests for version-map-signing.mjs and sign-version-map.mjs: node --test tools/version-map-signing.test.mjs
packages/
├── a11y-testing/ the shared accessibility bar: Jest preset, WCAG helpers, report (devDependency only, never bundled)
├── contracts/  @pokedex/contracts — the route params and module types, published to a registry
├── detail/     @pokedex/detail — the Pokémon detail view as a versioned component; presentational, fed by each consumer's own container
└── ui/         @pokedex/ui — the design system: gluestack-ui copy-in primitives, colour tokens and composed components, shared at runtime as a host-provided singleton
```

## Quick start

Requirements: Node 22.11+, Xcode with an iOS simulator, Ruby + Bundler, CocoaPods.

```sh
git clone https://github.com/warrendeleon/react-native-module-federation
cd react-native-module-federation
git checkout post-17-signing-rollback
```

The apps install four `@pokedex` packages from a local registry, so publish them before installing anything. Leave the registry running in its own terminal:

```sh
npx verdaccio                                    # :4873, stays up
npm adduser --registry http://localhost:4873     # any username, password and email
npm config set @pokedex:registry http://localhost:4873/
```

That third line matters more than it looks. npm reads project config from the directory holding
`package.json`, so the `.npmrc` at this repo's root is invisible to every `( cd packages/… && npm
install )` below it, and `npm adduser` writes an auth token rather than a scope mapping. Without
the scope set for your user, each `@pokedex` install goes to the public registry and 404s.

Publish in dependency order. Each package's own `npm install` resolves the `@pokedex` packages
it depends on, so a package has to be on the registry before the one that needs it runs:
`a11y-testing` is a devDependency of `ui` and `detail`, and `ui` is a peer of `detail`.

```sh
( cd packages/contracts && npm install && npm run build && npm publish )
( cd packages/a11y-testing && npm install && npm run build && npm publish )
( cd packages/ui && npm install && npm run build && npm publish )
( cd packages/detail && npm install && npm run build && npm publish )
```

Then the apps:

```sh
( cd apps/list && npm install )
( cd apps/party && npm install )
( cd apps/host && npm install )

# install iOS pods for the host
( cd apps/host/ios && bundle install && bundle exec pod install )

# prove the federation builds: three Re.Pack bundles, both remote manifests, the host bundle
sh scripts/federation-smoke.sh
```

Then, in four terminals:

```sh
# 1. the list remote's dev server
( cd apps/list && npm run start:remote )  # :8082

# 2. the party remote's dev server
( cd apps/party && npm run start:remote )  # :8083

# 3. the host's dev server
( cd apps/host && npm start )  # :8081

# 4. build and launch the host on a simulator
( cd apps/host && npm run ios )
```

The host boots on the Pokédex tab and fetches the `list` remote from `:8082`, which fills the shared store with the first 151 Pokémon from PokéAPI. Tap a row and the list's container fetches that Pokémon through the same store and feeds it to the view installed from `@pokedex/detail`, pushed inside the Pokédex tab so the tab bar stays on screen. Tap **Add to party** on a detail and the dispatch crosses the seam: the party app's slice — injected into the shared store at boot — catches it, the Pokédex header counter ticks, and the Party tab shows the member. With two or more members, **Quick Battle** on the Party tab hands the party to a fully native screen the host presents, and the winner's uid comes back through one promise into the party's own state.

### Running the remotes from a CDN instead

The same app, with the remotes' dev servers switched off. Build them for production, serve the
result as static files, and point the host at it:

```sh
node tools/gen-signing-keys.mjs                    # once: the two signing keys, and their public halves
MF_RELEASE_SEQ=1 node tools/build-cdn.mjs ios      # or android, or omit for both
npx http-server@14.1.1 cdn-root -p 8000 -c-1 --cors       # leave it running
```

The first command writes two keypairs: the one that signs every production chunk, whose public
half goes into `apps/host/ios/Host/Info.plist` and
`apps/host/android/app/src/main/res/values/strings.xml`, where the host's native verifier reads it
from, and the one that signs the version map, whose public half goes into
`apps/host/src/shell/version-map-public-key.ts`, which `scriptManager.ts` imports and hands to the
host's own verifier. The second builds every published version of both remotes and writes one
signed version map per released app version, each carrying the release counter `MF_RELEASE_SEQ`
names:

```
cdn-root/ios/listApp/1.0.0/      cdn-root/ios/maps/1.0.0/version-map.json
cdn-root/ios/listApp/1.1.0/      cdn-root/ios/maps/2.0.0/version-map.json
cdn-root/ios/listApp/1.2.0/
cdn-root/ios/partyApp/1.0.0/
```

Then, in two terminals:

```sh
# 1. the host's dev server, told where the remotes live and which binary this is
( cd apps/host && MF_CDN_BASE=http://localhost:8000 MF_APP_VERSION=2.0.0 npm start )

# 2. build and launch the host
( cd apps/host && npm run ios )
```

At launch the app fetches `maps/2.0.0/version-map.json`, and loads exactly the versions that file
names. The banner above the tab bar says which mode the launch resolved to and which versions it
got; the chip in the Pokédex header says which build of the list remote is on screen.

Build it as `MF_APP_VERSION=1.0.0` instead and the same source produces a binary that asks a
different question and is handed listApp 1.0.0. Two app versions, one CDN, different code — which
is the whole reason the map is per app version.

A release build works the same way, with everything baked in at build time rather than read from a
running dev server:

```sh
( cd apps/host && MF_CDN_BASE=http://localhost:8000 MF_APP_VERSION=2.0.0 npm run ios -- --mode Release )
( cd apps/host && MF_CDN_BASE=http://10.0.2.2:8000 MF_APP_VERSION=2.0.0 npm run android -- --mode release )
```

An Android emulator reaches the machine at `10.0.2.2` rather than `localhost`, and a release
build talks plain http to either only because `res/xml/network_security_config.xml` permits it
for `localhost`, `127.0.0.1` and `10.0.2.2`, with their subdomains, and nothing else.

### Shipping a remote version without a new binary

Two steps, in this order, against the tree the server is already serving. Build the version and
put its directory on the CDN first:

```sh
( cd apps/list && MF_REMOTE_VERSION=1.3.0 npm run bundle:ios:prod )
rsync -a --exclude '*.map' --exclude mf-stats.json apps/list/cdn/ios/listApp/1.3.0/ cdn-root/ios/listApp/1.3.0/
```

Nothing has changed for anybody yet: the directory is there and no map points at it. Then edit one
line of `cdn-root/ios/maps/2.0.0/version-map.json`, the listApp entry under `versions`:

```json
{
  "seq": 1,
  "versions": {
    "listApp": "1.3.0",
    "partyApp": "1.0.0"
  },
  "sig": "..."
}
```

The map is signed, so the edit is not yet a publish: the file now fails the signature check and
every launch that fetches it refuses it, so a release build runs from its copies and a debug build
on iOS, which has none, refuses every remote. Sign it, with a release counter higher
than the last one published:

```sh
MF_RELEASE_SEQ=2 node tools/sign-version-map.mjs ios 2.0.0
```

which rewrites the file as `{ "seq": 2, "versions": { ... }, "sig": "..." }`. Relaunch the
installed app and it loads the new version. The map is the commit, which is why it is written and
signed last: a map pointing at a directory that is not there yet is a 404 for every user who
launches in between. What they get is the copy of that remote their binary carries (see
[When the CDN is not there](#when-the-cdn-is-not-there)): a working tab, but the version the binary
shipped with, not the one being released. Rolling back is the same edit in reverse, signed with
the next counter again, and it needs no build at all, because the old version's directory was
never removed. The counter always goes up, rollbacks included: it orders publishes, not versions,
and that is what lets an app tell a rollback you published from an old map somebody served it (see
[The signed map and the counter](#the-signed-map-and-the-counter)).

`tools/build-cdn.mjs` seeds a CDN rather than operating one. Running it again rebuilds the whole
tree from the lists at the top of the file, so it is the wrong tool for adding one version's
directory or editing a map; `tools/sign-version-map.mjs` is the tool for the map.

### When the CDN is not there

`tools/build-cdn.mjs` also prepares the copy a release build carries: the version of each remote
that its app version's map names, its signed bundles and its manifest, staged in `embed-root/`,
with the versions recorded in `apps/host/src/shell/embedded-versions.ts`. The last build phase of
the iOS target and a Gradle task on Android copy `embed-root/` into the binary byte for byte, so
every bundle keeps the signature it is verified against. Run it before the release build; without
`embed-root/` both builds warn, succeed, and carry nothing. It re-signs every map as it goes, so
it takes a new counter like any publish.

```sh
MF_RELEASE_SEQ=<one higher than the last counter you published> node tools/build-cdn.mjs ios
( cd apps/host && MF_CDN_BASE=http://localhost:8000 MF_APP_VERSION=2.0.0 npm run ios -- --mode Release )
```

Stop the server, check that `curl http://localhost:8000/ios/maps/2.0.0/version-map.json` now
fails, and cold-start the app: the banner turns purple and reads `bundled`, and both tabs open
from the copies. Start the server again, move `cdn-root/ios/listApp/1.2.0` out of `cdn-root`, and
cold-start once more: the list's manifest is a 404, so that one remote runs from its copy and the
banner reads `cdn · listApp 1.2.0 embedded · partyApp 1.0.0`, while the party still loads from the
CDN. Move the directory back afterwards.

On iOS a copy needs a release build: a development build loads its own bundle from the dev server,
so there is no app directory to read a copy from. A development build with no CDN configured stays
on the dev servers on both platforms.

### The signed map and the counter

Chunk signing protects the content of every chunk; nothing in post 15 protected the choice of
version. A map is `{ seq, versions, sig }`: the versions, a release counter, and an Ed25519
signature over the two of them and over what the map is for, made with the key
`tools/gen-signing-keys.mjs` keeps in `code-signing/` and checked at launch against the public half
compiled into the host. The bytes that are signed are not the JSON but a string rebuilt from the
values on both sides, `<platform>|<appVersion>|<seq>|` then every `name@version` sorted by name, so
key order and whitespace cannot break a signature, and so the map written for app 1.0.0 does not
verify when it is served at app 2.0.0's URL. Remote names are letters, digits and underscores, and
versions letters, digits, dots, dashes and underscores: a name holding `@` or `,` could make two
different maps sign to the same string, so both tools refuse one before signing and the host
refuses one before verifying.

The device remembers the highest counter it has accepted. A map it cannot verify is refused, and so
is a map whose counter is lower than that: an old map served again, however good its signature.
Equal is accepted, because the same map fetched twice is not an attack. Every refusal is logged
with its reason and the launch runs from the copies, as it would with no CDN at all. To see each
one, with the server running:

```sh
# edit one version string in cdn-root/ios/maps/2.0.0/version-map.json and cold-start:
#   [federation] version map refused: signature does not verify
# publish with a higher counter, launch, then put the previous map file back and launch again:
#   [federation] version map refused: release counter is older than the last one accepted
# sign that map with the next counter, naming listApp 1.1.0: accepted, and the app loads 1.1.0
```

Three rules are easy to miss. The counter always goes up, rollbacks included, and it is one counter
for the whole CDN: a device keeps the highest it accepted on any app version, and keeps it across a
binary update, so `sign-version-map` refuses a counter that does not move past every map under
`cdn-root/`. Never regenerate the map-signing key for an app that is installed: those installs trust
the key they were built with and refuse every map signed by another. And neither private key enters
the repository: `code-signing/` is ignored before the generator is ever run.

### When a version keeps failing

A signed map can be current, valid and wrong: it can name a version that fails to load on every
launch, because its manifest, container or chunks do not arrive or verify, or because it throws as
it is evaluated. The nets catch that once per session and run the copy, and the next launch asks
the CDN again and fails the same way. So the host keeps one small record per remote between
launches, in MMKV: which CDN version it is counting and how many launches that version has failed
since it last rendered from the CDN. A remote that drops to its copy counts one failed launch
against the version the map named. At two the next launch sends that remote to its copy before
trying the CDN, and the banner marks it:

```
cdn · listApp 1.2.0 rolled back · partyApp 1.0.0
```

Only a render of the CDN version in its tab clears the count: a remote on its copy rendered the
copy, which says nothing about the version the map names, and a launch that never opens the tab
cannot clear it, though partyApp's boot loads can still add to it. A different version in the map
starts the count over, so a fixed release is tried on its first launch. A version that loads and
then throws as it renders is not counted: its code has run, the tab shows its error state and Try
again renders it again, as post 16 decided.

To see the cycle, point the map at a version the CDN does not hold, sign it, and launch three
times: the first two drop the list to its copy mid-launch, and the third runs it from the copy
without asking. Then point the map at a version that exists, sign it again, and the fourth launch
tries it and clears the record.

## Architecture

```mermaid
flowchart TD
    registry[("local registry :4873<br/>@pokedex/contracts · @pokedex/detail · @pokedex/ui<br/>@pokedex/a11y-testing (devDependency, never bundled)")]
    pokeapi(["PokéAPI"])
    subgraph host["host — the shell (:8081)"]
        tabs["bottom tab bar"]
        store["Redux store<br/>reducer + baseApi from the contract"]
        t1["Pokédex tab"]
        t2["Party tab"]
        native["Quick Battle<br/>SwiftUI · Jetpack Compose<br/>presented by the host's TurboModule"]
        copies[("the copy in the binary<br/>one signed version of each remote,<br/>the one its app version's map names")]
        memory[("MMKV<br/>the highest release counter accepted<br/>+ each remote's failed-launch record")]
        tabs --> t1
        tabs --> t2
    end
    cdn[("CDN · cdn-root<br/>every published version + one signed map per app version<br/>{ seq, versions, sig }")]
    list[("list remote<br/>:8082 · ListStack")]
    party[("party remote<br/>:8083 · PartyStack + partySlice")]
    t1 -.->|"React.lazy · loaded at launch"| list
    t2 -.->|"React.lazy · loaded on first open"| party
    host -.->|"boot loads: partyApp/partySlice + partyApp/styles"| party
    list ==>|"injects getPokemonList + getPokemonDetail<br/>dispatches addToParty · reads the count"| store
    party ==>|"injects the party slice + its own getPokemonDetail"| store
    store <-->|"fetches through baseQuery"| pokeapi
    registry -->|"contracts + ui, installed by version"| host
    registry -->|"contracts + ui + the detail view"| list
    registry -->|"contracts + ui + the detail view"| party
    party ==>|"shellNavigate('QuickBattle') · awaits the winner's uid"| native
    t1 & t2 -.->|"release build: the versions its map names,<br/>once the map's signature and counter pass"| cdn
    t1 & t2 -.->|"release build, no usable or believable map: every remote runs from its copy<br/>one remote fails from the CDN: the manifest net or the tab's boundary drops it here<br/>a version that failed two launches since it last rendered from the CDN: sent here at launch"| copies
    host -.->|"reads the counter and the record at launch;<br/>writes the counter on an accepted map with a higher seq,<br/>the record on a drop to the copy and a CDN render"| memory
```
