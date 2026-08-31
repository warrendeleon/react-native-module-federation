package com.host

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import org.json.JSONObject

// --- The native screen a federated remote reached, in Jetpack Compose. The SwiftUI counterpart is
// ios/Host/QuickBattle.swift, and the two screens are the same screen: same tokens, same badge,
// same two exits.
//
// It is an Activity started for result, which is what makes the promise on the other side safe by
// construction. Nothing here has to remember to settle it: whatever ends this Activity, the
// platform hands a result back to ShellNavigationModule. ---
class QuickBattleActivity : ComponentActivity() {

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    val contestants = decodeMembers(intent.getStringExtra(EXTRA_PARAMS_JSON) ?: "{}")
    setContent { QuickBattleScreen(contestants = contestants, onFinish = ::deliverResult) }
  }

  // RESULT_OK with the JSON extra is what ShellNavigationModule's ActivityEventListener reads.
  // A system back never reaches this method, and does not need to: the Activity finishes with no
  // result, and the listener reads a null Intent as an empty object.
  private fun deliverResult(resultJson: String) {
    setResult(Activity.RESULT_OK, Intent().putExtra(EXTRA_RESULT_JSON, resultJson))
    finish()
  }

  companion object {
    const val EXTRA_PARAMS_JSON = "paramsJson"
    const val EXTRA_RESULT_JSON = "resultJson"
  }
}

// --- Model ---

/** The uid is the party's own, carried across and handed back untouched. */
private data class Contestant(val uid: String, val name: String)

private fun decodeMembers(paramsJson: String): List<Contestant> {
  val members =
    try {
      JSONObject(paramsJson).optJSONArray("members")
    } catch (e: Exception) {
      null
    } ?: return emptyList()
  return (0 until members.length()).mapNotNull { i ->
    val entry = members.optJSONObject(i) ?: return@mapNotNull null
    val uid = entry.optString("uid").takeIf { it.isNotEmpty() } ?: return@mapNotNull null
    Contestant(uid = uid, name = entry.optString("name", "Unknown"))
  }
}

// --- Design tokens, hand-mirrored from packages/ui/src/tokens/colours.ts as the Swift Theme is ---

private object Theme {
  val navy = Color(0xFF0F172A)
  val blue = Color(0xFF3A86FF)
  val purple = Color(0xFF8338EC)
  val black = Color(0xFF2E3138)
  val pokemonGreen = Color(0xFF9BE89B)
  val white = Color(0xFFFFFFFF)
}

// --- Composables ---

@Composable
private fun QuickBattleScreen(contestants: List<Contestant>, onFinish: (String) -> Unit) {
  var winnerUid by remember { mutableStateOf<String?>(null) }

  fun finishPayload(): String {
    val uid = winnerUid ?: return "{}"
    return JSONObject().put("winnerUid", uid).toString()
  }

  Box(Modifier.fillMaxSize().background(Theme.navy)) {
    Column(
      // safeDrawing keeps the content clear of the status bar and any display cutout.
      Modifier.fillMaxSize()
        .windowInsetsPadding(WindowInsets.safeDrawing)
        .verticalScroll(rememberScrollState())
        .padding(24.dp),
      horizontalAlignment = Alignment.CenterHorizontally,
      verticalArrangement = Arrangement.spacedBy(18.dp),
    ) {
      NativeBadge()

      Text("Quick Battle", color = Theme.white, fontSize = 22.sp, fontWeight = FontWeight.Bold)

      Column(Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        for (c in contestants) {
          ContestantRow(contestant = c, isWinner = winnerUid == c.uid)
        }
      }

      winnerUid?.let { uid ->
        val w = contestants.first { it.uid == uid }
        Text("${w.name} wins!", color = Theme.white, fontSize = 20.sp, fontWeight = FontWeight.Bold)
      }

      PrimaryButton(if (winnerUid == null) "Battle!" else "Battle again") {
        winnerUid = contestants.randomOrNull()?.uid
      }

      SecondaryButton(if (winnerUid == null) "Close" else "Done") { onFinish(finishPayload()) }
    }
  }
}

@Composable
private fun ContestantRow(contestant: Contestant, isWinner: Boolean) {
  Row(
    Modifier.fillMaxWidth()
      .clip(RoundedCornerShape(16.dp))
      .background(if (isWinner) Theme.pokemonGreen else Theme.white)
      .padding(horizontal = 16.dp, vertical = 14.dp),
    verticalAlignment = Alignment.CenterVertically,
  ) {
    Text(
      contestant.name,
      color = Theme.black,
      fontSize = 17.sp,
      fontWeight = FontWeight.Bold,
      modifier = Modifier.weight(1f),
    )
    if (isWinner) Text("🏆", fontSize = 20.sp)
  }
}

// Purple, a token the app's chrome uses nowhere else, so a screenshot says on its own which side
// of the boundary it was taken on.
@Composable
private fun NativeBadge() {
  Text(
    "⟡ NATIVE ANDROID",
    color = Theme.white,
    fontSize = 11.sp,
    fontWeight = FontWeight.Bold,
    modifier =
      Modifier.clip(RoundedCornerShape(50))
        .background(Theme.purple)
        .padding(horizontal = 12.dp, vertical = 6.dp),
  )
}

@Composable
private fun PrimaryButton(title: String, onClick: () -> Unit) {
  Text(
    title,
    color = Theme.white,
    fontSize = 17.sp,
    fontWeight = FontWeight.Bold,
    textAlign = TextAlign.Center,
    modifier =
      Modifier.fillMaxWidth()
        .clip(RoundedCornerShape(14.dp))
        .background(Theme.blue)
        .clickable(onClick = onClick)
        .padding(vertical = 14.dp),
  )
}

@Composable
private fun SecondaryButton(title: String, onClick: () -> Unit) {
  Text(
    title,
    color = Theme.blue,
    fontSize = 15.sp,
    fontWeight = FontWeight.SemiBold,
    textAlign = TextAlign.Center,
    modifier =
      Modifier.fillMaxWidth()
        .clip(RoundedCornerShape(14.dp))
        .clickable(onClick = onClick)
        .padding(vertical = 12.dp),
  )
}
