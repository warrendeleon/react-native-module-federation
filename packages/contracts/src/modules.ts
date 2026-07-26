import type { ComponentType } from 'react';
import type { DetailParams } from './params';

// The shape of each federated module, so an ambient `declare module` points at a definition both
// sides installed instead of a guess only the consumer has read.

// A stack takes no props. The host mounts it in a tab and everything inside is the remote's
// business, so this seam is deliberately empty.
export type ListStackModule = ComponentType;
export type PartyStackModule = ComponentType;

// The detail screen is pushed by a navigator, so its props arrive from React Navigation. Describing
// the route structurally, rather than importing the navigator's types, keeps this package free of a
// navigation dependency: it states the shape it needs and stays agnostic about who produces it.
export interface PokemonDetailScreenProps {
  route: { params: DetailParams };
}

export type PokemonDetailScreenModule = ComponentType<PokemonDetailScreenProps>;
