import { createStore } from 'zustand/vanilla';
import { MAX_PARTY, type PartyMember } from './party';

// nanoid came from Redux Toolkit and Redux Toolkit is gone on this branch. A counter plus a
// timestamp is enough for uids that only have to stay unique within one session.
let n = 0;
const uid = () => `party-${Date.now().toString(36)}-${n++}`;

interface PartyState {
  members: PartyMember[];
  add: (member: Omit<PartyMember, 'uid'>) => void;
  remove: (uid: string) => void;
}

// --- The party's store, shipped in the contract package. On the Redux branch the party app created
// this state itself and injected it into a running store; nothing in Zustand adds a store to a
// running app, so the state has to exist before anyone reads it, which means it has to ship where
// every side can import it. That is the trade in one file: the runtime injection step disappears,
// and every new piece of shared state becomes a release of this package — a deploy on web, an App
// Store cycle on mobile.
//
// `createStore` from zustand/vanilla, not the `create` hook: this package holds no React. Consumers
// subscribe with `useStore(partyStore, selector)` from the React entry point.
//
// The cap sits inside `add` because `add` is where the owning team's rules live. Every write that
// goes through it is capped. `partyStore.setState` is also public, on every Zustand store, and it
// goes around this function entirely. ---
export const partyStore = createStore<PartyState>((set, get) => ({
  members: [],
  add: member => {
    if (get().members.length >= MAX_PARTY) return;
    set(state => ({ members: [...state.members, { ...member, uid: uid() }] }));
  },
  remove: id => set(state => ({ members: state.members.filter(m => m.uid !== id) })),
}));
