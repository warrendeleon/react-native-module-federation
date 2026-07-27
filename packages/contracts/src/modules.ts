import type { ComponentType } from 'react';

// The shape of each federated module, so an ambient `declare module` points at a definition both
// sides installed instead of a guess only the consumer has read.

// A stack takes no props. The host mounts it in a tab and everything inside is the remote's
// business, so this seam is deliberately empty.
export type ListStackModule = ComponentType;
export type PartyStackModule = ComponentType;
