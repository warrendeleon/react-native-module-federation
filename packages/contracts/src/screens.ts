import type { ComponentType } from 'react';

// The props the host passes across the seam to each federated screen. This file is the single
// source of truth for that seam: the remote builds its screen against the prop type, the host
// renders the screen against the same type, and because both import it from here the compiler holds
// the two in step. Change a prop and both sides stop compiling until they agree again.

export interface PokedexScreenProps {
  // The list remote reports which Pokémon was tapped. The host owns navigation and decides what
  // happens next, so the remote never imports a navigator; it just hands back an id.
  onSelectPokemon: (id: number) => void;
  // Added in 1.1.0. Optional on purpose: a host built against 1.0.0 never passes it, and still
  // satisfies the contract. That is what makes an additive change safe to roll out unevenly.
  onLongPressPokemon?: (id: number) => void;
}

// The profile screen takes nothing from the host yet. An empty contract is still a contract: the
// host's import resolves to "a component with no props", enforced rather than assumed, and the day
// it does take a prop this is the one place that changes.
export type ProfileScreenProps = Record<string, never>;

// The exposed-module types, composed from the props above. The host's ambient module declarations
// point at these, so a federated import is typed from the same source the remote was built against
// instead of a hand-written guess that nothing checks.
export type PokedexScreenModule = ComponentType<PokedexScreenProps>;
export type ProfileScreenModule = ComponentType<ProfileScreenProps>;
