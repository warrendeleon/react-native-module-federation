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

It holds types only, so every import is `import type` and nothing survives into a bundle. There is no
runtime dependency to share across the federation.

```sh
npm install
npm run build      # emits dist/; the apps install this package by version from the local registry
```
