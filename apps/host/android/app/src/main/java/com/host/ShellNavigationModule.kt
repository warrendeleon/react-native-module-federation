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
// Android's shape does most of the promise discipline for it. The screen is an Activity started
// for result, so the platform delivers a result for every exit of a screen that opened — the Done
// button, the system back gesture — and onActivityResult is the single place a delivered result
// settles the promise. What structure does not cover is the launch itself: a start that throws,
// or a teardown racing the UI-thread hop. Those two windows are closed by hand below. ---
class ShellNavigationModule(reactContext: ReactApplicationContext) :
  NativeShellNavigationModuleSpec(reactContext) {

  // Held from the moment the Activity is launched until it returns. One at a time, which is the
  // counterpart of the iOS presenter's isPresenting flag. Both fields are touched from the
  // native-modules thread (openNative, invalidate) and the UI thread (the launch block, the
  // result listener), so every mutation sits inside synchronized(this).
  private var pendingPromise: Promise? = null

  // Flipped once in invalidate and never back: a launch queued before teardown must not open a
  // screen after it, because nobody is listening and its result could land on a later battle.
  private var invalidated = false

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
        synchronized(this@ShellNavigationModule) {
          pendingPromise?.resolve(result)
          pendingPromise = null
        }
      }
    }

  init {
    reactApplicationContext.addActivityEventListener(activityEventListener)
  }

  override fun openNative(nativeId: String, paramsJson: String, promise: Promise) {
    val activity = reactApplicationContext.currentActivity
    if (activity == null) {
      // Nothing to launch from: settle now rather than leave the caller waiting on a result
      // that will never be delivered.
      promise.resolve("{}")
      return
    }
    synchronized(this) {
      if (pendingPromise != null || invalidated) {
        // A battle already running, or the module already torn down: same answer.
        promise.resolve("{}")
        return
      }
      pendingPromise = promise
    }
    // nativeId goes unread: one native flow exists today, and a second registry row would need a
    // switch here first. openNative arrives on a background queue; hop to the UI thread to start
    // the Activity rather than assume the queue is safe to start it from.
    activity.runOnUiThread {
      synchronized(this) {
        // invalidate can run between the queueing above and this block: the promise is settled
        // by then, and launching anyway would open a screen nobody is listening to.
        if (invalidated || pendingPromise == null) return@runOnUiThread
        try {
          val intent =
            Intent(activity, QuickBattleActivity::class.java).apply {
              putExtra(QuickBattleActivity.EXTRA_PARAMS_JSON, paramsJson)
            }
          activity.startActivityForResult(intent, QUICK_BATTLE_REQUEST)
        } catch (e: Exception) {
          // A launch that throws leaves no Activity to deliver a result. Settle now, or the
          // await outlives a screen that never opened.
          pendingPromise?.resolve("{}")
          pendingPromise = null
        }
      }
    }
  }

  override fun invalidate() {
    // A dev reload or host teardown while a battle is open would strand the caller's await:
    // the listener is about to go away, so settle the pending promise the way a resultless
    // exit does before it can no longer be settled at all, and refuse any launch still queued.
    synchronized(this) {
      invalidated = true
      pendingPromise?.resolve("{}")
      pendingPromise = null
    }
    reactApplicationContext.removeActivityEventListener(activityEventListener)
    super.invalidate()
  }

  companion object {
    private const val QUICK_BATTLE_REQUEST = 0xB47
  }
}
