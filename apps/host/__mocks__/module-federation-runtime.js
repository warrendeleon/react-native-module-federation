// --- Stands in for @module-federation/runtime under Jest, for the same reason the Re.Pack client
// is mocked next door: the real registerRemotes talks to a federation runtime the bundler creates,
// and nothing creates one here. Calls are recorded rather than dropped, so a test can assert that
// the host re-registered the remotes it resolved, and with the force flag, and which runtime
// plugins it installed. ---
const calls = [];
const plugins = [];

module.exports = {
  registerRemotes: (remotes, options) => calls.push({ remotes, options }),
  registerPlugins: list => plugins.push(...list),
  /** Every registerRemotes call this process has seen. */
  __calls: calls,
  /** Every runtime plugin the host installed. */
  __plugins: plugins,
};
