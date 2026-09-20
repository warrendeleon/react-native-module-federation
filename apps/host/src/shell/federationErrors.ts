// --- Why this file exists.
//
// When a remote's chunk fails to load — a signature that does not verify, a version that is not
// on the CDN — the app handles it. Webpack's remote runtime catches the rejection, records it,
// and leaves the module unresolvable; React.lazy then hands RemoteBoundary a module that is not a
// component, and the boundary renders the design system's error state. One tab is dead, the shell
// and the other tab carry on. That is the behaviour this app is built for and it works.
//
// The same error is ALSO reported to React Native's global error handler, which treats it as
// fatal. In a development build that is a red box over a working app. In a release build it ends
// the process: verification doing its job, or a mistyped version in the map, takes the whole app
// down before the boundary's error state is ever seen. Measured on release builds of both
// platforms, with a tampered chunk and with a version the CDN does not hold.
//
// So the host claims that one error. It is not suppressing a failure — the failure is already
// handled, visibly, one tab away — it is declining to let a handled failure be reported twice,
// the second time fatally. Everything that is not this exact shape is passed to the handler that
// was there before, unchanged. ---

// --- What identifies an error the federation layer has already dealt with.
//
// Webpack's remote runtime wraps every attempt to load a federated module. When one fails, its
// error handler records the failure, replaces the module with one that cannot resolve, and
// appends `while loading "<request>" from <container>` to the message. That suffix is written at
// exactly one place in the runtime, and only after the failure has been absorbed, which is what
// makes it usable as evidence rather than as a guess.
//
// Matching the suffix rather than the error itself is deliberate, because there is more than one
// error. A chunk whose signature does not verify arrives as a ChunkLoadError; a version that is
// not on the CDN arrives as `[ Federation Runtime ]: Failed to get manifest. #RUNTIME-003`. Both
// carry the suffix, both leave the tab showing its error state, and a guard written around either
// one of them would have let the other kill the app.
//
// The container half is not inspected for the same reason. In a development build it reads
// `webpack/container/reference/listApp`; in a release build that module is minified to its
// numeric id, `77469`. A check for the remote's name there passes in development and fails in
// release, which is the shape of bug this guard exists to prevent. ---
const HANDLED_BY_REMOTE_RUNTIME = /while loading "[^"]+" from \S+/;

/**
 * Whether an error is a federated module failure that webpack's remote runtime has already
 * absorbed, and whose tab RemoteBoundary is already showing an error state for.
 */
export function isHandledRemoteLoadError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) {
    return false;
  }
  const { message } = error as { message?: unknown };
  return typeof message === 'string' && HANDLED_BY_REMOTE_RUNTIME.test(message);
}

type GlobalErrorHandler = (error: unknown, isFatal?: boolean) => void;
type ErrorUtilsShape = {
  getGlobalHandler: () => GlobalErrorHandler;
  setGlobalHandler: (handler: GlobalErrorHandler) => void;
};

/**
 * Installs the guard. Safe to call more than once: the previous handler is captured on the first
 * call and every later call is a no-op, so a fast refresh cannot build a chain of wrappers.
 */
let installed = false;
export function guardHandledRemoteLoadErrors(): void {
  const errorUtils = (globalThis as { ErrorUtils?: ErrorUtilsShape }).ErrorUtils;
  if (installed || !errorUtils) {
    return;
  }
  installed = true;
  const previous = errorUtils.getGlobalHandler();
  errorUtils.setGlobalHandler((error, isFatal) => {
    if (isHandledRemoteLoadError(error)) {
      // Logged, not swallowed: the reason a tab is showing an error state belongs in the console
      // of whoever is looking at it.
      console.warn('[federation] a remote failed to load; its tab shows the error state', error);
      return;
    }
    previous(error, isFatal);
  });
}
