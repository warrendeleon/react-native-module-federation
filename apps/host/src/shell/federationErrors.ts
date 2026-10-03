// --- Why this file exists.
//
// When a federated module the host imports with import() fails to load (a signature that does not
// verify, a version that is not on the CDN), three things happen, in this order. Webpack's remote
// runtime records the error and replaces the module's factory with one that throws. Re.Pack's
// guarded require, which Re.Pack puts in the runtime of every bundle it builds, catches that
// throw, reports the error to React Native's global error handler as fatal, and returns nothing.
// Only then does the import settle, without the module.
//
// The fatal report comes first, before anything that asked for the module has heard back. In a
// development build it is a red box over a working app. In a release build it ends the process:
// verification doing its job, or a mistyped version in the map, takes the whole app down before
// the code that would have handled the failure gets its turn. Measured on iOS Release builds with
// a tampered chunk and with a version the CDN does not hold, and on an Android release build with a
// version the CDN does not hold, when the tabs still loaded their stacks with import().
//
// So the host logs that one report and drops it. The guard does not handle the failure: it keeps
// the process alive, so the code that asked for the module can handle what follows from it.
//
// Since the fallback post the host no longer imports a remote module with import() at all. Every
// federated load goes through loadRemoteModule in scriptManager.ts (App.tsx says why), and a load
// that fails there rejects like any other promise, with no report to the global handler. The
// matcher stays for any import() added later. Dropping its report is safe only while every such
// import checks what it settles with as well as catching a rejection: the guarded require can turn
// the failure into a fulfilled import with no usable module, which a catch alone never sees.
//
// There is a second shape of fatal report, which this file now holds back as well. A remote whose
// code throws while it is being evaluated (a module that throws at its top level, or one that
// calls, as it loads, something the host's copy of a shared library does not have) fails inside
// Re.Pack's guarded require too: the remote's container is a bundle Re.Pack built, so the
// outermost require in it is guarded as well. The report is fatal, the require returns nothing,
// and no suffix marks it, because as far as the remote runtime is concerned the load succeeded.
// Measured on an iOS Release build with a list version that throws at the top of one of its
// modules: with only the matcher below, the app ended at launch. What marks this report is when it
// happens, which is what evaluateRemoteModule, below, is for.
//
// Everything that is neither of these two shapes is passed to the handler that was there before,
// unchanged. ---

// --- What identifies an error the federation layer has already dealt with.
//
// Webpack's remote runtime wraps every attempt to load a federated module. When one fails, its
// error handler records the failure, replaces the module's factory with one that throws, and
// appends `\nwhile loading "<request>" from <container>` to the message. That suffix is written at
// exactly one place in the runtime, only after the failure has been absorbed, and always as the
// last line of the message, which is what makes it usable as evidence rather than as a guess. The
// match is anchored there: the same words anywhere else in a message are not this suffix.
//
// Matching the suffix rather than the error itself is deliberate, because there is more than one
// error. A chunk whose signature does not verify arrives as a ChunkLoadError; a version that is
// not on the CDN arrives as `[ Federation Runtime ]: Failed to get manifest. #RUNTIME-003`. Both
// carry the suffix, both are handled by whatever asked for the module, and a guard written around
// either one of them would have let the other kill the app.
//
// The container half is not inspected for the same reason. In a development build it reads
// `webpack/container/reference/listApp`; in a release build that module is minified to its
// numeric id, `77469`. A check for the remote's name there passes in development and fails in
// release, which is the shape of bug this guard exists to prevent. ---
const HANDLED_BY_REMOTE_RUNTIME = /\nwhile loading "[^"\n]+" from \S+$/;

/**
 * Whether an error is a federated module failure that webpack's remote runtime has recorded and
 * turned into a module that throws. The import() that asked for it can settle without a usable
 * module rather than reject, so its caller has to check what it received.
 */
export function isHandledRemoteLoadError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) {
    return false;
  }
  const { message } = error as { message?: unknown };
  return typeof message === 'string' && HANDLED_BY_REMOTE_RUNTIME.test(message);
}

// --- A remote module evaluated where its failure can be caught. For every remote module the host
// loads, the runtime plugin in scriptManager.ts hands the module's factory to evaluateRemoteModule
// before anything runs it. That works because loadRemoteModule asks the runtime for the factory
// unexecuted, with loadFactory: false. While the factory runs, a fatal report is that module's
// own: the guard holds it instead of passing it on, and once the factory returns, the error is
// thrown from here, so the load that asked for the module fails like any other failed load.
//
// The window is exact because evaluation is synchronous: nothing else can run between opening it
// and closing it. Only fatal reports are held; a non-fatal one passes through as it always did.
//
// Through loadRemoteModule the error thrown from here rejects the load and reaches no handler.
// Through an import() it would reach the host's own guarded require, which reports it as fatal a
// second time, outside the window, so every error thrown from here is remembered, and the guard
// drops that second report the way it drops the suffix. Both records live on the global object,
// under names every evaluation of this file knows, for the same Fast Refresh reason as the
// wrapped handler below. ---
const EVALUATING = '__federationEvaluating';
const THROWN = '__federationEvaluationErrors';
type Evaluation = { failure?: { error: unknown } };

function store(): Record<string, unknown> {
  return globalThis as unknown as Record<string, unknown>;
}

function thrownFromEvaluation(): WeakSet<object> {
  const globals = store();
  if (!(globals[THROWN] instanceof WeakSet)) {
    globals[THROWN] = new WeakSet<object>();
  }
  return globals[THROWN] as WeakSet<object>;
}

// Remembered as an object, because a WeakSet holds nothing else: a module that throws a string is
// failed with an Error that carries it.
function remember(error: unknown): object {
  const thrown = typeof error === 'object' && error !== null ? error : new Error(String(error));
  thrownFromEvaluation().add(thrown);
  return thrown;
}

/**
 * Runs a remote module's factory, and throws the error of any fatal report raised while it runs.
 * The first report is the one thrown: it is the cause, and anything after it followed from it.
 */
export function evaluateRemoteModule<T>(factory: () => T): T {
  const globals = store();
  const outer = globals[EVALUATING];
  const evaluation: Evaluation = {};
  globals[EVALUATING] = evaluation;
  try {
    let exports: T;
    try {
      exports = factory();
    } catch (error) {
      throw remember(error);
    }
    if (evaluation.failure) {
      throw remember(evaluation.failure.error);
    }
    return exports;
  } finally {
    globals[EVALUATING] = outer;
  }
}

function isThrownFromEvaluation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && thrownFromEvaluation().has(error);
}

type GlobalErrorHandler = (error: unknown, isFatal?: boolean) => void;
type ErrorUtilsShape = {
  getGlobalHandler: () => GlobalErrorHandler;
  setGlobalHandler: (handler: GlobalErrorHandler) => void;
};

// --- Where the guard keeps the handler it wraps. Fast Refresh can evaluate this module again in a
// running app, and each evaluation starts with fresh module state, so a flag in this file cannot
// tell a second installation from a first. The wrapper carries the handler underneath it instead,
// on a property every evaluation of the module knows by name. ---
const WRAPPED = '__federationGuardWrapped';
type GuardHandler = GlobalErrorHandler & { [WRAPPED]?: GlobalErrorHandler };

/**
 * Installs the guard around the current global handler. Installing again, from the same module or
 * from a re-evaluated one, unwraps the earlier guard first and wraps the handler it was guarding,
 * so there is only ever one guard, and it is always the newest version of this file.
 */
export function guardHandledRemoteLoadErrors(): void {
  const errorUtils = (globalThis as { ErrorUtils?: ErrorUtilsShape }).ErrorUtils;
  if (!errorUtils) {
    return;
  }
  const current: GuardHandler = errorUtils.getGlobalHandler();
  const previous = current[WRAPPED] ?? current;
  const guard: GuardHandler = (error, isFatal) => {
    const evaluation = store()[EVALUATING] as Evaluation | undefined;
    if (evaluation && isFatal) {
      evaluation.failure ??= { error };
      console.warn(
        '[federation] a remote module threw while it was evaluated; the load that asked for it fails instead',
        error,
      );
      return;
    }
    if (isHandledRemoteLoadError(error) || isThrownFromEvaluation(error)) {
      // Logged, not swallowed: the reason a module is missing belongs in the console of whoever
      // is looking at it.
      console.warn(
        '[federation] a remote module failed to load; the import that asked for it handles it',
        error,
      );
      return;
    }
    previous(error, isFatal);
  };
  guard[WRAPPED] = previous;
  errorUtils.setGlobalHandler(guard);
}
