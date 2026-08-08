// --- The party's crossing surface. Everything in this file is here because something OUTSIDE the
// party app touches it: the list app adds a member, and any surface that reflects the cap — a
// disabled button, a counter — reads the same number. What the party does with a member once it
// has one is its own business.
//
// On the Redux branch this file also held the action creator the list app dispatched and the
// tolerant read shape a foreign module used before the slice existed. Neither has a job here: the
// write is a function on the store next door, and the store ships with the package, so there is no
// moment when the state is missing. ---

// The cap is the owner's rule; the number lives at the seam so every surface enforces or reflects
// the same one.
export const MAX_PARTY = 6;

export interface PartyMember {
  uid: string;
  id: number;
  name: string;
  spriteUri: string;
}
