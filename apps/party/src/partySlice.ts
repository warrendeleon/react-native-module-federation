import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { addToParty, MAX_PARTY, rootReducer, type PartyMember } from '@pokedex/contracts';

// --- The party's state, owned outright by the party app. The contract carries the action creator
// and the read shape; this file carries what they mean. Nothing outside this app imports it — the
// host loads it as a federated module at boot, for the side effect at the bottom. ---
export const partySlice = createSlice({
  name: 'party',
  initialState: { members: [] as PartyMember[] },
  reducers: {
    // Private: nobody else dispatches remove, so it ships in no contract.
    remove(state, action: PayloadAction<string>) {
      state.members = state.members.filter(m => m.uid !== action.payload);
    },
  },
  extraReducers: builder => {
    // The crossing interaction. The list app dispatches the contract's addToParty, and this case
    // matches it on the type string: addCase reads actionCreator.type and keys the reducer by
    // `party/add`, so agreement on that string is what makes the match work, not the identity of
    // the creator object. Sharing @pokedex/contracts as a singleton is what stops the two sides
    // from retyping that string, the cap and the read shape separately.
    builder.addCase(addToParty, (state, { payload }) => {
      if (state.members.length >= MAX_PARTY) return; // the cap lives with the owner
      state.members.push(payload);
    });
  },
});

export const { remove } = partySlice.actions;

// Importing this module is what adds the reducer to the shared store. rootReducer is the same
// object the host's configureStore wired in — that is why injection from a separately-built app
// works at all.
rootReducer.inject(partySlice);
