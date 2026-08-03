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
    // The crossing interaction. The list app dispatches the contract's addToParty; this case
    // matches it because both sides hold the SAME action creator — @pokedex/contracts is a
    // federation singleton, so `party/add` is one object, not two that happen to share a string.
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
