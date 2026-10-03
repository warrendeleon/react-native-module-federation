// --- Stands in for @module-federation/runtime under Jest, for the same reason the Re.Pack client
// is mocked in repack-client.js: the real runtime is one the bundler creates, and nothing creates
// one here.
// Calls are recorded rather than dropped, so a test can assert what the host asked of it: which
// remotes it re-registered and with the force flag, which plugins it installed, which remote
// modules a tab asked for.
//
// The registrations are also kept the way the runtime keeps them, one entry per remote name, a
// forced registration replacing the one before, because the host reads them back through
// getInstance to find where a remote loads from now. ---
const SERVED = {
  'partyApp/partySlice': () => require('./partyApp-partySlice.js'),
  'partyApp/styles': () => require('./partyApp-styles.js'),
};

const calls = [];
const plugins = [];
const registered = [];
const loads = [];

module.exports = {
  registerRemotes: (remotes, options) => {
    calls.push({ remotes, options });
    remotes.forEach(remote => {
      const index = registered.findIndex(entry => entry.name === remote.name);
      if (index === -1) {
        registered.push(remote);
      } else if (options?.force) {
        registered.splice(index, 1, remote);
      }
    });
  },
  registerPlugins: list => plugins.push(...list),
  getInstance: () => ({ options: { remotes: registered } }),
  // The two modules the host loads from partyApp at boot are served from __mocks__, as factories
  // when the host asks for factories, which is how it asks. Anything else, a tab's stack included,
  // never settles here: under Jest there is no remote to load, and a load that stays pending leaves
  // a tab on its loading state instead of failing a test that is about something else. A test
  // about loading passes its own load function to the boundary.
  loadRemote: (id, options) => {
    loads.push(id);
    const factory = SERVED[id];
    if (!factory) {
      return new Promise(() => {});
    }
    return Promise.resolve(options?.loadFactory === false ? factory : factory());
  },
  /** Every registerRemotes call this process has seen. */
  __calls: calls,
  /** Every runtime plugin the host installed. */
  __plugins: plugins,
  /** The remotes as the runtime holds them now. */
  __registered: registered,
  /** Every remote module a loadRemote call asked for. */
  __loads: loads,
};
