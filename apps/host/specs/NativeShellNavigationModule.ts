import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

// --- The TurboModule spec: the one place the host's JavaScript and its native code agree on a
// signature. Codegen reads this file at build time and writes the C++/ObjC++ and Kotlin base
// classes the native implementations extend, which is why the file lives outside src/ and why
// its name has to start with `Native`.
//
// One method, and it is asynchronous by shape: openNative hands a native flow its input and
// resolves with whatever that flow passed back. The promise is the whole design — the party's
// await does not return until the native screen has finished, and every exit path of that screen
// has to settle it exactly once.
//
// The boundary is JSON strings in both directions rather than codegen object types. Codegen can
// carry structured objects, and a bigger bridge should let it; a string keeps the serialisation
// visible in one place on each side, which is easier to follow while the bridge is one method
// wide. ---

export interface Spec extends TurboModule {
  openNative(nativeId: string, paramsJson: string): Promise<string>;
}

// getEnforcing throws when no native module answers to the name: a binary built without the
// native half, or a codegen mismatch. React Native's own examples import a spec like this at
// module scope, and with the module in the binary that is fine. The host's handler requires this
// file lazily instead, as a choice about where that throw is allowed to land. Imported at boot,
// a missing native half kills the shell during bundle evaluation, before any error boundary
// exists; required at the call, the same fault surfaces at the button press, in a running app
// that can log it and carry on. Runtime delivery is what makes the skew real: JavaScript can
// arrive on a binary that never built the native side.
export default TurboModuleRegistry.getEnforcing<Spec>('ShellNavigationModule');
