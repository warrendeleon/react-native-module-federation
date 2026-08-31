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

// getEnforcing throws when the module is missing from the running binary, and it throws at the
// moment this module is first imported. That is the behaviour you want — a shell whose native
// half did not build should fail loudly — but it means nothing may import this file at module
// scope during boot: TurboModules initialise lazily, and an import that lands before the registry
// is ready takes the app down with a white screen and no error boundary to catch it. The host's
// handler requires this file inside the call instead.
export default TurboModuleRegistry.getEnforcing<Spec>('ShellNavigationModule');
