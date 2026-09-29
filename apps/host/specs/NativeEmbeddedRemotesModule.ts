import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

// --- Android's half of the copy in the binary. A Gradle task packs each remote's embedded version
// into the APK's assets, and assets are not files on disk: Re.Pack's file:// loader needs a real
// path. prepare() copies them out to the app's files directory once per installed build, keeping
// the <remote>/<version>/ layout, and resolves with the directory the host builds file:// URLs
// against.
//
// There is no iOS implementation, because iOS reads the copies straight from the .app. That is why
// this uses TurboModuleRegistry.get, which returns null where the module does not exist, rather
// than getEnforcing, which would throw on iOS the moment this file loads. ---
export interface Spec extends TurboModule {
  /** Copy the embedded remotes out, once per installed build, and return the directory. */
  prepare(appVersion: string): Promise<string>;
}

export default TurboModuleRegistry.get<Spec>('EmbeddedRemotesModule');
