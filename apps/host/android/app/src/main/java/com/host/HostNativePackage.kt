package com.host

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider
import com.host.specs.NativeEmbeddedRemotesModuleSpec
import com.host.specs.NativeShellNavigationModuleSpec

// --- Registration. iOS gets this for free from RCT_EXPORT_MODULE and autolinking; Android wants
// it written down, in two halves. getModule builds the instance when the registry asks for it by
// name, and getReactModuleInfoProvider declares what that name is and how it behaves — the last
// flag is the one that matters here, because it is what marks the module as a TurboModule rather
// than a legacy bridge module.
//
// The package is added to MainApplication's list, in the slot the React Native template leaves
// commented for exactly this. ---
class HostNativePackage : BaseReactPackage() {

  override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? =
    when (name) {
      NativeShellNavigationModuleSpec.NAME -> ShellNavigationModule(reactContext)
      NativeEmbeddedRemotesModuleSpec.NAME -> EmbeddedRemotesModule(reactContext)
      else -> null
    }

  override fun getReactModuleInfoProvider() = ReactModuleInfoProvider {
    mapOf(
      NativeShellNavigationModuleSpec.NAME to
        ReactModuleInfo(
          NativeShellNavigationModuleSpec.NAME,
          ShellNavigationModule::class.java.name,
          false, // canOverrideExistingModule
          false, // needsEagerInit
          false, // isCxxModule
          true, // isTurboModule
        ),
      NativeEmbeddedRemotesModuleSpec.NAME to
        ReactModuleInfo(
          NativeEmbeddedRemotesModuleSpec.NAME,
          EmbeddedRemotesModule::class.java.name,
          false, // canOverrideExistingModule
          false, // needsEagerInit
          false, // isCxxModule
          true, // isTurboModule
        ),
    )
  }
}
