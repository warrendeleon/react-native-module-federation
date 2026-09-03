import { ROUTE_REGISTRY, type ShellNavigateFn, type ShellNavigateResult } from '@pokedex/contracts';

import type { Spec as ShellNavigationSpec } from '../../specs/NativeShellNavigationModule';

// --- The host's half of shell.navigateTo. A remote calls the contract's shellNavigate; this is
// what runs. It looks the destination up in the routing table and hands native destinations to the
// TurboModule, JSON in and JSON out. The remote never learns which branch it took. ---

// The spec module calls TurboModuleRegistry.getEnforcing at import, and that throws when no
// native module answers to the name. Requiring it here, inside the call, decides where that
// throw can land: at the tap, in a running shell that logs it and carries on, rather than during
// boot evaluation, where a missing native half would kill the app with no error boundary.
function nativeModule(): ShellNavigationSpec {
  return require('../../specs/NativeShellNavigationModule').default as ShellNavigationSpec;
}

export const shellNavigateHandler: ShellNavigateFn = async (destination, params) => {
  const entry = ROUTE_REGISTRY[destination];
  if (!entry) {
    // An unknown destination is a caller's bug, not a crash: warn and resolve, so a remote built
    // against a newer contract than the host degrades to nothing happening.
    console.warn(`[shellNavigate] unknown destination: ${destination}`);
    return undefined;
  }

  const resultJson = await nativeModule().openNative(entry.nativeId, JSON.stringify(params ?? {}));
  return resultJson ? (JSON.parse(resultJson) as ShellNavigateResult) : undefined;
};
