# @pokedex/contracts

The typed seam between federated remotes.

Each remote is built and shipped on its own, so no app has a compile-time view of what the others
expose. Left alone, every consumer hand-writes an ambient `declare module` for each federated import:
a guess the compiler believes and never checks against the real module.

This package replaces the guess with one definition, installed by version. Two things live here:

- **Route params.** The list remote and the party remote both push a Pokémon detail screen, and the
  detail remote reads what they pushed. Three separately-built apps have to agree on that shape, and
  none of them can own it without the other two depending on its source.
- **Module shapes.** The type of each exposed module, so an ambient declaration points at a
  definition both sides installed.

It began as types only. Since post 6 it also carries runtime: `baseApi`, the RTK Query instance
every app shares, and the Zod schemas that parse PokéAPI at the boundary. That is why it is a
Module Federation singleton rather than a build-time convenience, and why it does reach the
bundle: the host and every remote have to import the same object, not merely the same shape.

```sh
npm install
npm run build      # emits dist/; the apps install this package by version from the local registry
```
