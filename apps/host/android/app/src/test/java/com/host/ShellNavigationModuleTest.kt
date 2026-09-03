package com.host

import android.app.Activity
import android.content.Intent
import com.facebook.react.bridge.ActivityEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Test
import org.mockito.kotlin.any
import org.mockito.kotlin.anyOrNull
import org.mockito.kotlin.argumentCaptor
import org.mockito.kotlin.doAnswer
import org.mockito.kotlin.doThrow
import org.mockito.kotlin.mock
import org.mockito.kotlin.never
import org.mockito.kotlin.verify
import org.mockito.kotlin.whenever

// --- The bridge's Android contract, pinned where a simulator run cannot reach: the promise must
// settle exactly once whatever happens to the launch. Every test drives the real module against
// mocked platform edges — an Activity whose runOnUiThread runs inline (or is captured to run
// later, which is how the teardown race is staged), a Promise that records its settlement, and
// the listener the module registers at construction. ---
class ShellNavigationModuleTest {

  private lateinit var context: ReactApplicationContext
  private lateinit var activity: Activity
  private lateinit var module: ShellNavigationModule
  private lateinit var listener: ActivityEventListener
  private var queued: Runnable? = null

  private fun promiseRecording(into: MutableList<String>): Promise {
    val p = mock<Promise>()
    doAnswer { inv ->
      into.add(inv.arguments[0].toString())
      null
    }.whenever(p).resolve(anyOrNull())
    return p
  }

  @Before
  fun setUp() {
    context = mock()
    activity = mock()
    val captor = argumentCaptor<ActivityEventListener>()
    module = ShellNavigationModule(context)
    verify(context).addActivityEventListener(captor.capture())
    listener = captor.firstValue
    whenever(context.currentActivity).thenReturn(activity)
    // Default: the UI-thread hop runs inline. A test that stages the teardown race overrides
    // this to capture the runnable instead and fire it after invalidate.
    doAnswer { inv ->
      (inv.arguments[0] as Runnable).run()
      null
    }.whenever(activity).runOnUiThread(any())
  }

  @Test
  fun `a launch that throws settles the promise and frees the slot`() {
    doThrow(RuntimeException("launch refused")).whenever(activity)
      .startActivityForResult(anyOrNull(), any())
    val results = mutableListOf<String>()
    module.openNative("quickBattle", "{}", promiseRecording(results))
    assertEquals(listOf("{}"), results)

    // The slot is free again: a second call is not eaten by a stale pendingPromise.
    val second = mutableListOf<String>()
    module.openNative("quickBattle", "{}", promiseRecording(second))
    assertEquals(listOf("{}", "{}"), results + second)
  }

  @Test
  fun `invalidate settles a pending promise and removes the listener`() {
    val results = mutableListOf<String>()
    module.openNative("quickBattle", "{}", promiseRecording(results))
    assertEquals(0, results.size)

    module.invalidate()
    assertEquals(listOf("{}"), results)
    verify(context).removeActivityEventListener(listener)
  }

  @Test
  fun `a launch queued before invalidate does not start an orphaned Activity`() {
    // Capture the hop instead of running it, exactly the window the race lives in.
    doAnswer { inv ->
      queued = inv.arguments[0] as Runnable
      null
    }.whenever(activity).runOnUiThread(any())

    val results = mutableListOf<String>()
    module.openNative("quickBattle", "{}", promiseRecording(results))
    module.invalidate()
    assertEquals(listOf("{}"), results)

    // Teardown already settled the promise; the late runnable must refuse to launch.
    queued!!.run()
    verify(activity, never()).startActivityForResult(anyOrNull(), any())
  }

  @Test
  fun `a second call while one battle is open settles immediately with an empty result`() {
    doAnswer { }.whenever(activity).startActivityForResult(anyOrNull(), any())
    val first = mutableListOf<String>()
    val second = mutableListOf<String>()
    module.openNative("quickBattle", "{}", promiseRecording(first))
    module.openNative("quickBattle", "{}", promiseRecording(second))
    assertEquals(0, first.size)
    assertEquals(listOf("{}"), second)
  }

  @Test
  fun `no current activity settles immediately`() {
    whenever(context.currentActivity).thenReturn(null)
    val results = mutableListOf<String>()
    module.openNative("quickBattle", "{}", promiseRecording(results))
    assertEquals(listOf("{}"), results)
  }

  @Test
  fun `a call after invalidate settles immediately`() {
    module.invalidate()
    val results = mutableListOf<String>()
    module.openNative("quickBattle", "{}", promiseRecording(results))
    assertEquals(listOf("{}"), results)
  }

  @Test
  fun `a null-Intent result resolves an empty object, and a carried result resolves its JSON`() {
    doAnswer { }.whenever(activity).startActivityForResult(anyOrNull(), any())

    val back = mutableListOf<String>()
    module.openNative("quickBattle", "{}", promiseRecording(back))
    listener.onActivityResult(activity, 0xB47, Activity.RESULT_OK, null)
    assertEquals(listOf("{}"), back)

    val winner = mutableListOf<String>()
    module.openNative("quickBattle", "{}", promiseRecording(winner))
    val data = mock<Intent>()
    whenever(data.getStringExtra(QuickBattleActivity.EXTRA_RESULT_JSON))
      .thenReturn("{\"winnerUid\":\"abc\"}")
    listener.onActivityResult(activity, 0xB47, Activity.RESULT_OK, data)
    assertEquals(listOf("{\"winnerUid\":\"abc\"}"), winner)
  }

  @Test
  fun `a foreign request code is ignored`() {
    doAnswer { }.whenever(activity).startActivityForResult(anyOrNull(), any())
    val results = mutableListOf<String>()
    module.openNative("quickBattle", "{}", promiseRecording(results))
    listener.onActivityResult(activity, 0x123, Activity.RESULT_OK, null)
    assertEquals(0, results.size)
  }
}
