/**
 * Stand-in for the federated party state module. The real one arrives over the wire and
 * Jest has no federation runtime, so the runtime's stand-in serves this one when the host asks
 * for partyApp/partySlice: the same side effect (inject the party's reducer into the shared
 * rootReducer), none of the transport.
 */
const { rootReducer } = require('@pokedex/contracts');

rootReducer.inject({
  reducerPath: 'party',
  reducer: (state = { members: [] }) => state,
});

module.exports = {};
