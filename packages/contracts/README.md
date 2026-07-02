# @pokedex/contracts

The typed seam between the host and every federated remote.

A remote is built and shipped on its own, so the host has no compile-time view of what it exposes.
Left to itself the host hand-writes an ambient `declare module` for each remote, a guess the compiler
never checks against the real screen. This package replaces the guess with one shared source of truth:
the prop type of each exposed screen, imported by the host (to render the screen) and by the remote
(to build it). Change a prop and both sides stop compiling until they agree.

It holds types only, so every import is `import type` and nothing survives into the bundle. There is
no runtime dependency to share across the federation.

```sh
npm install
npm run build      # emits dist/; the host and remotes install this package by version from the local Verdaccio registry
```
