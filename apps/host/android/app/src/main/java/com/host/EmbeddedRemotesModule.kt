package com.host

import android.content.pm.PackageManager
import android.os.Build
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.host.specs.NativeEmbeddedRemotesModuleSpec
import java.io.File

// --- The copies in the binary, made readable. The embedRemotes Gradle task packs them into the
// APK at assets/cdn/android/<remote>/<version>/, and an APK asset is not a file on disk, while
// Re.Pack's file:// loader needs one. This copies assets/cdn out to the app's files directory and
// resolves with that directory, which the host then builds file:// URLs against, the same way iOS
// builds them against its .app.
//
// The copy runs once per installed build. A marker file records the app version and the time the
// APK was installed or updated, so a relaunch reuses the extracted tree and any new install,
// including a rebuilt APK that kept its version number, replaces it. ---
class EmbeddedRemotesModule(reactContext: ReactApplicationContext) :
  NativeEmbeddedRemotesModuleSpec(reactContext) {

  override fun prepare(appVersion: String, promise: Promise) {
    try {
      val filesDir = reactApplicationContext.filesDir
      val cdnDir = File(filesDir, "cdn")
      val marker = File(cdnDir, ".installed")
      val installed = "$appVersion@${lastUpdateTime()}"
      if (!(marker.exists() && marker.readText() == installed)) {
        cdnDir.deleteRecursively()
        // A build whose embed step found nothing to copy ships no assets/cdn at all. Then there is
        // nothing to extract and no marker is written, so the next install extracts again.
        if (reactApplicationContext.assets.list("")?.contains("cdn") == true) {
          copyAsset("cdn", filesDir)
          marker.writeText(installed)
        }
      }
      promise.resolve(filesDir.absolutePath)
    } catch (e: Exception) {
      promise.reject("EMBED_PREPARE_FAILED", e.message, e)
    }
  }

  private fun lastUpdateTime(): Long {
    val packageManager = reactApplicationContext.packageManager
    val packageName = reactApplicationContext.packageName
    val info =
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
        packageManager.getPackageInfo(packageName, PackageManager.PackageInfoFlags.of(0))
      } else {
        packageManager.getPackageInfo(packageName, 0)
      }
    return info.lastUpdateTime
  }

  // Copy one asset path into destParent, keeping its name, so assets/cdn lands at destParent/cdn.
  // The bytes are copied exactly as they are: every bundle is signed over its bytes, and a file
  // changed on the way out would fail verification when it loads. AssetManager.list returns the
  // children of a directory and an empty array for a file, which is how the two are told apart.
  private fun copyAsset(assetPath: String, destParent: File) {
    val assets = reactApplicationContext.assets
    val children = assets.list(assetPath) ?: emptyArray()
    val dest = File(destParent, assetPath)
    if (children.isEmpty()) {
      dest.parentFile?.mkdirs()
      assets.open(assetPath).use { input -> dest.outputStream().use { output -> input.copyTo(output) } }
    } else {
      dest.mkdirs()
      for (child in children) {
        copyAsset("$assetPath/$child", destParent)
      }
    }
  }
}
