import type { PartyMember } from './party';

// --- The shell's routing surface, and the whole of what a remote knows about native. A remote
// imports `shellNavigate` and nothing else: no TurboModule, no native types, no idea whether the
// destination it names is another micro-app or a fully native screen. The host owns the table that
// decides, so migrating a native flow to React Native later is one row edit here and no change in
// any remote. ---

export type RouteEntry =
  /** Hands off to native: the host calls openNative, a native screen presents, and the promise
   *  resolves with whatever that screen passed back. */
  { type: 'native'; nativeId: string };

// One entry, because one thing dispatches. The union above is written as a union of one so a
// micro-app variant can join it without the readers of `entry.type` changing shape; a registry row
// with nothing behind it is a dead constant, and this series has already paid for one of those.
export const ROUTE_REGISTRY: Record<string, RouteEntry> = {
  QuickBattle: { type: 'native', nativeId: 'quickBattle' },
};

// --- What crosses the boundary, in both directions. These types live in the contract because the
// HOST has to serialise them, not because another app dispatches anything: the battle's outcome is
// the party's own business and the party's own reducer handles it. ---

/** RN -> native. The party hands over its members; the native screen shows and battles them. */
export interface QuickBattleParams extends Record<string, unknown> {
  members: PartyMember[];
}

/** Native -> RN. The uid, not the id: two copies of the same Pokémon are two contestants, and the
 *  party has stamped a uid on each member since 3.1.0 for exactly that reason. Absent when the
 *  screen closed without a battle. */
export interface QuickBattleResult {
  winnerUid?: string;
}

/** Native resolves with an object, or with nothing when the flow ended without a result. */
export type ShellNavigateResult = Record<string, unknown> | undefined;

export type ShellNavigateFn = (
  destination: string,
  params?: Record<string, unknown>,
) => Promise<ShellNavigateResult>;

// --- The slot the host fills and every remote reads. It is a globalThis key rather than a React
// context because this package is bundled into the host AND into each remote: a context created
// here would be a different object in every bundle, so a remote's useContext would never find the
// host's provider. The module identity that posts 3 and 6 made a singleton for is exactly what is
// missing at this seam, and globalThis is the one slot all three bundles genuinely share. ---
const GLOBAL_KEY = '__POKEDEX_SHELL_NAVIGATE__';

export function registerShellNavigateHandler(fn: ShellNavigateFn): void {
  (globalThis as Record<string, unknown>)[GLOBAL_KEY] = fn;
}

export function shellNavigate(
  destination: string,
  params?: Record<string, unknown>,
): Promise<ShellNavigateResult> {
  const fn = (globalThis as Record<string, unknown>)[GLOBAL_KEY] as ShellNavigateFn | undefined;
  if (typeof fn !== 'function') {
    // No handler: warn and resolve. A remote that awaits this gets undefined and renders something
    // honest, which is the same tolerance the party slice's read shape is built on.
    console.warn(`[shellNavigate] no handler registered (called with ${destination})`);
    return Promise.resolve(undefined);
  }
  return fn(destination, params);
}
