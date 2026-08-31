package com.host

import android.app.Activity
import android.content.Intent
import com.facebook.react.bridge.BaseActivityEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.host.specs.NativeShellNavigationModuleSpec

// --- The host's native half of shell.navigateTo on Android, and the mirror of the iOS
// ShellNavigationModule. Codegen read the same spec file and wrote NativeShellNavigationModuleSpec
// into com.host.specs; this class extends it, so the JavaScript `openNative` lands here.
//
// Android's shape makes the promise discipline structural rather than a matter of care. The screen
// is an Activity started for result, so the platform delivers a result for every in-process exit —
// the Done button, the system back gesture. onActivityResult is the single place the promise is
// settled, and there is no path back that skips it. ---
class ShellNavigationModule(reactContext: ReactApplicationContext) :
  NativeShellNavigationModuleSpec(reactContext) {

  // Held from the moment the Activity is launched until it returns. One at a time, which is the
  // counterpart of the iOS presenter's isPresenting flag.
  private var pendingPromise: Promise? = null

  private val activityEventListener =
    object : BaseActivityEventListener() {
      override fun onActivityResult(
        activity: Activity,
        requestCode: Int,
        resultCode: Int,
        data: Intent?,
      ) {
        if (requestCode != QUICK_BATTLE_REQUEST) return
        // Every exit lands here. A battle that finished carries its JSON; a back gesture carries
        // no data at all, and an empty object is the honest answer for it — the party reads a
        // missing winnerUid as "nothing happened".
        val result = data?.getStringExtra(QuickBattleActivity.EXTRA_RESULT_JSON) ?: "{}"
        pendingPromise?.resolve(result)
        pendingPromise = null
      }
    }

  init {
    reactApplicationContext.addActivityEventListener(activityEventListener)
  }

  override fun openNative(nativeId: String, paramsJson: String, promise: Promise) {
    val activity = reactApplicationContext.currentActivity
    if (activity == null || pendingPromise != null) {
      // Nothing to launch from, or a battle already running: settle this promise now rather than
      // leave a second caller waiting on a result that will never be delivered to it.
      promise.resolve("{}")
      return
    }
    pendingPromise = promise
    // openNative arrives on a background queue; starting an Activity has to be on the UI thread.
    activity.runOnUiThread {
      val intent =
        Intent(activity, QuickBattleActivity::class.java).apply {
          putExtra(QuickBattleActivity.EXTRA_PARAMS_JSON, paramsJson)
        }
      activity.startActivityForResult(intent, QUICK_BATTLE_REQUEST)
    }
  }

  override fun invalidate() {
    reactApplicationContext.removeActivityEventListener(activityEventListener)
    super.invalidate()
  }

  companion object {
    private const val QUICK_BATTLE_REQUEST = 0xB47
  }
}
