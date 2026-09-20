// --- Stands in for @callstack/repack/client under Jest.
//
// ScriptManager.shared reaches for __webpack_require__ the moment it is touched: the real one is
// a singleton the bundler puts in the runtime, and a Jest process has no bundler and no runtime.
// Importing it here is unavoidable, because registering the resolver at module scope is what
// makes it in place before the first federated import — so the runtime is mocked instead.
//
// The resolver's own decisions are not mocked away with it. They live in src/shell/remoteLocator,
// as plain functions, and __tests__/remoteLocator.test.ts asks them directly.
const resolvers = [];

const shared = {
  addResolver: (resolver, options) => resolvers.push([resolver, options]),
  removeAllResolvers: () => resolvers.splice(0, resolvers.length),
};

module.exports = {
  ScriptManager: { shared },
  /** What the host registered, for a test that wants to assert the registration itself. */
  __resolvers: resolvers,
};
