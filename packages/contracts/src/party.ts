import { createAction, nanoid } from '@reduxjs/toolkit';

// --- The party's crossing surface. Everything in this file is here because something OUTSIDE the
// party app touches it: the list app dispatches the add, and any surface that reflects the cap —
// a disabled button, a counter — reads the same number. The party's other actions (remove, for
// one) appear in no contract, because nobody else dispatches them. A contract carries what
// crosses, nothing more. ---

// The cap is the owner's rule; the number lives at the seam so every surface enforces or reflects
// the same one.
export const MAX_PARTY = 6;

export interface PartyMember {
  uid: string;
  id: number;
  name: string;
  spriteUri: string;
}

// The one interaction that crosses an app boundary. The contract owns the action's shape; the
// party's reducer owns what it means. Dispatchers pass the member; the uid is stamped here in
// `prepare`, so the reducer stays pure and two copies of the same Pokémon stay distinguishable.
export const addToParty = createAction(
  'party/add',
  (member: Omit<PartyMember, 'uid'>) => ({ payload: { ...member, uid: nanoid() } }),
);

// Dispatched by the host once the party's state module has loaded and injected its reducer.
// rootReducer.inject() swaps an entry in the reducer map and rebuilds the combined reducer, but
// it never dispatches, so the store's state does not gain a `party` key until the NEXT action
// runs through the new reducer. This marker is that action: no case handles it, and dispatching
// it does exactly one useful thing — `state.party` appears, which is the signal write-side
// consumers gate on before offering the add.
export const partyStateReady = createAction('party/stateReady');

// The tolerant read shape. The party's slice is injected at runtime by a module the reader does
// not control, so at the moment a foreign module reads, the slice may not exist yet. The optional
// is the design, not defensiveness: readers write `s.party?.members ?? []` and render something
// honest either way.
export interface PartySliceShape {
  party?: { members: PartyMember[] };
}
