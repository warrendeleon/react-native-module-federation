package com.host

import android.app.Activity
import android.content.Intent
import android.graphics.BitmapFactory
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.produceState
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.view.WindowCompat
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.net.URL
import org.json.JSONObject

// --- The native screen a federated remote reached, in Jetpack Compose. The SwiftUI counterpart is
// ios/Host/QuickBattle.swift, and the two are the same screen: same mirrored tokens, same card,
// same two exits.
//
// It is an Activity started for result, which is what makes the promise on the other side safe by
// construction. Nothing here has to remember to settle it: whatever ends this Activity, the
// platform hands a result back to ShellNavigationModule. ---
class QuickBattleActivity : ComponentActivity() {

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    val params = intent.getStringExtra(EXTRA_PARAMS_JSON) ?: "{}"
    val contestants = decodeMembers(params)
    val isDark = decodeScheme(params)
    // The status bar belongs to whatever Activity is in front, and this one is not the Activity
    // React Native themed at boot. Without this line a light battle draws light icons on its own
    // offWhite field and the clock disappears.
    WindowCompat.getInsetsController(window, window.decorView).isAppearanceLightStatusBars = !isDark
    setContent {
      QuickBattleScreen(contestants = contestants, isDark = isDark, onFinish = ::deliverResult)
    }
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

private data class Contestant(
  val uid: String,
  val dexNumber: Int,
  val name: String,
  val spriteUri: String,
  val types: List<String>,
) {
  val primaryType: String get() = types.firstOrNull() ?: "normal"
}

/** The theme the party was wearing at the moment it called. Sent, not observed: see the note on
 *  QuickBattleParams in the contract. */
private fun decodeScheme(paramsJson: String): Boolean =
  try {
    JSONObject(paramsJson).optString("colourScheme") == "dark"
  } catch (e: Exception) {
    false
  }

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
    val typesArray = entry.optJSONArray("types")
    val types =
      if (typesArray == null) emptyList()
      else (0 until typesArray.length()).map { typesArray.optString(it) }
    Contestant(
      uid = uid,
      dexNumber = entry.optInt("id"),
      name = entry.optString("name", "Unknown"),
      spriteUri = entry.optString("spriteUri"),
      types = types,
    )
  }
}

// --- Design tokens, hand-mirrored from packages/ui/src/tokens/colours.ts and typeColours.ts, as
// the SwiftUI Theme is. A fuller setup would generate both from those files. ---

private object Theme {
  val navy = Color(0xFF0F172A)
  val black = Color(0xFF2E3138)
  val blue = Color(0xFF3A86FF)
  // The brand blue is a fill, not an ink: on this dark field it measures 3.74:1, under the 4.5:1
  // small text needs. blueTextDark is the readable pair colours.ts already defines for exactly
  // this surface, and the one the tab bar's active label takes in dark mode.
  val blueTextDark = Color(0xFF79AEFF)
  val purple = Color(0xFF8338EC)
  val white = Color(0xFFFFFFFF)
  val offWhite = Color(0xFFF7F8FC)
  val offGrey = Color(0xFFF0F2F5)
  val blueText = Color(0xFF2065E0)
  val midGrey = Color(0xFF9A9AB0)
  val lightGrey = Color(0xFFDBDCE6)
  val darkGrey = Color(0xFF515151)
  val typeInk = Color(0xFF000000)

  private val typeHex =
    mapOf(
      "normal" to 0xFFC5B1A1, "fire" to 0xFFF78E69, "water" to 0xFF3A86FF,
      "electric" to 0xFFF7D02C, "grass" to 0xFFA6D3A0, "ice" to 0xFFA3D9FF,
      "fighting" to 0xFF6C0E23, "poison" to 0xFFECB0E1, "ground" to 0xFFE2BF65,
      "flying" to 0xFFF5CAC3, "psychic" to 0xFFE75A7C, "bug" to 0xFFA8A77A,
      "rock" to 0xFF775B59, "ghost" to 0xFF735797, "dragon" to 0xFF6F35FC,
      "dark" to 0xFF1C2321, "steel" to 0xFF797270, "fairy" to 0xFFD685AD,
    )

  // Pre-decided in typeColours.ts from relative luminance rather than judged by eye, and copied
  // as a decision rather than recomputed, so the two sides cannot drift apart quietly.
  private val whiteInkTypes = setOf("fighting", "rock", "ghost", "dragon", "dark", "steel")

  fun colourFor(type: String): Color = Color(typeHex[type.lowercase()] ?: 0xFF9A9AB0)

  fun inkOn(type: String): Color = if (type.lowercase() in whiteInkTypes) white else typeInk

  // --- The surfaces, mirroring the design system's own dark: rules one for one. ScreenContainer
  // is `bg-offWhite dark:bg-navy`; PokemonCard is `bg-white dark:bg-black` with a white/10 border
  // in dark; its number pill is `bg-offGrey dark:bg-white/10` over `text-darkGrey
  // dark:text-lightGrey`; its name is `text-black dark:text-white`; its accent foot takes
  // `dark:opacity-60`. Read them there, not here, if they ever change. ---

  fun field(dark: Boolean) = if (dark) navy else offWhite

  fun cardSurface(dark: Boolean) = if (dark) black else white

  fun cardBorder(dark: Boolean) = if (dark) white.copy(alpha = 0.1f) else Color.Transparent

  fun pillSurface(dark: Boolean) = if (dark) white.copy(alpha = 0.1f) else offGrey

  fun pillInk(dark: Boolean) = if (dark) lightGrey else darkGrey

  fun heading(dark: Boolean) = if (dark) white else black

  fun secondary(dark: Boolean) = if (dark) lightGrey else darkGrey

  /** The readable blue for each surface. colours.ts carries both because no single blue clears
   *  4.5:1 on white and on navy. */
  fun actionInk(dark: Boolean) = if (dark) blueTextDark else blueText

  /** The accent foot and the winner's ring pull back in dark, as the card's own foot does. */
  fun accentAlpha(dark: Boolean) = if (dark) 0.6f else 1f
}

// --- Sprite loading. The party payload carries PokéAPI sprite URLs, and Compose ships no image
// loader of its own. This is the smallest thing that works: one fetch per URL, decoded off the
// main thread, memoised for the life of the screen so "Battle again" never refetches. A real app
// reaches for Coil here; the screen is kept dependency-free so the article's Android setup stays
// the Compose artefacts and nothing else. ---

private val spriteCache = mutableMapOf<String, ImageBitmap?>()

@Composable
private fun rememberSprite(uri: String): ImageBitmap? {
  val cached = spriteCache[uri]
  if (cached != null) return cached
  val state =
    produceState<ImageBitmap?>(initialValue = null, uri) {
      if (uri.isEmpty()) return@produceState
      value =
        withContext(Dispatchers.IO) {
          try {
            URL(uri).openStream().use { BitmapFactory.decodeStream(it)?.asImageBitmap() }
          } catch (e: Exception) {
            null
          }
        }
      spriteCache[uri] = value
    }
  return state.value
}

// --- Composables ---

@Composable
private fun QuickBattleScreen(
  contestants: List<Contestant>,
  isDark: Boolean,
  onFinish: (String) -> Unit,
) {
  var winnerUid by remember { mutableStateOf<String?>(null) }
  val winner = contestants.firstOrNull { it.uid == winnerUid }

  fun finishPayload(): String {
    val uid = winnerUid ?: return "{}"
    return JSONObject().put("winnerUid", uid).toString()
  }

  // The field the party was on: offWhite in light, navy in dark, the same pair ScreenContainer
  // resolves for every federated screen.
  Box(Modifier.fillMaxSize().background(Theme.field(isDark))) {
    Column(
      // safeDrawing keeps the content clear of the status bar and any display cutout.
      Modifier.fillMaxSize()
        .windowInsetsPadding(WindowInsets.safeDrawing)
        .verticalScroll(rememberScrollState())
        .padding(20.dp),
      horizontalAlignment = Alignment.CenterHorizontally,
      verticalArrangement = Arrangement.spacedBy(20.dp),
    ) {
      NativeBadge()

      Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(4.dp),
      ) {
        Text(
          "Quick Battle",
          color = Theme.heading(isDark),
          fontSize = 30.sp,
          fontWeight = FontWeight.Black,
        )
        Text(
          if (winner == null) "${contestants.size} in your party" else "${winner.name} takes it",
          color = Theme.secondary(isDark),
          fontSize = 14.sp,
          fontWeight = FontWeight.Medium,
        )
      }

      // Two columns, as the Pokédex grid and the party slots both use. Built from rows rather
      // than LazyVerticalGrid: the whole screen is one scroller, and nesting a lazy grid inside
      // it asks Compose to measure an unbounded height.
      Column(
        Modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(12.dp),
      ) {
        contestants.chunked(2).forEach { row ->
          Row(
            Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
          ) {
            row.forEach { c ->
              Box(Modifier.weight(1f)) {
                ContestantCard(
                  contestant = c,
                  isWinner = winnerUid == c.uid,
                  hasResult = winnerUid != null,
                  isDark = isDark,
                )
              }
            }
            // Keeps a lone card in an odd-sized party at half width instead of stretching it
            // across the row.
            if (row.size == 1) Spacer(Modifier.weight(1f))
          }
        }
      }

      winner?.let { w ->
        Row(
          verticalAlignment = Alignment.CenterVertically,
          horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
          Text("🏆", fontSize = 22.sp)
          Text(
            "${w.name} wins!",
            color = Theme.heading(isDark),
            fontSize = 22.sp,
            fontWeight = FontWeight.Black,
          )
        }
      }

      Column(
        Modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(10.dp),
      ) {
        PrimaryButton(if (winnerUid == null) "Battle!" else "Battle again") {
          winnerUid = contestants.randomOrNull()?.uid
        }
        // Both exits settle the promise. Done after a battle carries the winner; Close before one
        // carries an empty object, which is a real outcome and not an error.
        SecondaryButton(if (winnerUid == null) "Close" else "Done", isDark) {
          onFinish(finishPayload())
        }
      }
    }
  }
}

@Composable
private fun ContestantCard(
  contestant: Contestant,
  isWinner: Boolean,
  hasResult: Boolean,
  isDark: Boolean,
) {
  val accent = Theme.colourFor(contestant.primaryType)
  // A spring rather than a fade: the winner's card lifts into place, which is the one moment of
  // motion the screen gets and the reason it reads as a result.
  val scale by
    animateFloatAsState(
      targetValue = if (isWinner) 1.04f else 1f,
      animationSpec = spring(dampingRatio = 0.62f, stiffness = Spring.StiffnessMediumLow),
      label = "winnerLift",
    )

  Column(
    Modifier.scale(scale)
      // Losers recede rather than disappear: the comparison is the point, so they stay readable.
      .alpha(if (hasResult && !isWinner) 0.55f else 1f)
      // The winner's halo is the card's own shadow, not a light behind the grid. An earlier
      // version put a radial gradient under the whole row and it lit the loser as brightly as the
      // winner, which is the opposite of what a result should say. Tied to the card, it falls off
      // inside the gutter and cannot reach its neighbour.
      .then(
        if (isWinner)
          Modifier.shadow(
            elevation = 14.dp,
            shape = RoundedCornerShape(18.dp),
            ambientColor = accent,
            spotColor = accent,
          )
        else Modifier
      )
      .clip(RoundedCornerShape(18.dp))
      .background(Theme.cardSurface(isDark))
      // The winner is ringed in its own type colour rather than a generic highlight, so the
      // result is legible at a glance and stays inside the palette. Unringed, the card still
      // takes the hairline border PokemonCard wears in dark mode.
      .then(
        if (isWinner)
          Modifier.border(
            3.dp,
            accent.copy(alpha = Theme.accentAlpha(isDark)),
            RoundedCornerShape(18.dp),
          )
        else Modifier.border(1.dp, Theme.cardBorder(isDark), RoundedCornerShape(18.dp))
      )
  ) {
    Column(
      Modifier.fillMaxWidth().padding(horizontal = 12.dp).padding(top = 12.dp, bottom = 10.dp),
      horizontalAlignment = Alignment.CenterHorizontally,
      verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
      Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
        Text(
          "#%03d".format(contestant.dexNumber),
          color = Theme.pillInk(isDark),
          fontSize = 11.sp,
          fontWeight = FontWeight.SemiBold,
          modifier =
            Modifier.clip(CircleShape)
              .background(Theme.pillSurface(isDark))
              .padding(horizontal = 8.dp, vertical = 3.dp),
        )
        Spacer(Modifier.weight(1f))
        // The trophy takes the slot the remove button holds on the federated card, so the
        // winner's crown lands where the eye already expects a corner mark.
        if (isWinner) Text("🏆", fontSize = 18.sp)
      }

      Box(contentAlignment = Alignment.Center) {
        // The sprite sits on its primary type at 30%, the same tint the Pokédex grid uses, so
        // the disc reads as the same component rather than a lookalike.
        Box(Modifier.size(92.dp).clip(CircleShape).background(accent.copy(alpha = 0.3f)))
        val sprite = rememberSprite(contestant.spriteUri)
        if (sprite != null) {
          Image(
            bitmap = sprite,
            contentDescription = null,
            contentScale = ContentScale.Fit,
            modifier = Modifier.size(74.dp),
          )
        }
      }

      Text(
        contestant.name,
        color = Theme.heading(isDark),
        fontSize = 15.sp,
        fontWeight = FontWeight.Bold,
        maxLines = 1,
        textAlign = TextAlign.Center,
      )

      Row(
        horizontalArrangement = Arrangement.spacedBy(4.dp),
        modifier = Modifier.height(20.dp),
      ) {
        contestant.types.take(2).forEach { TypePill(it, isDark) }
      }
    }

    // The accent bar along the bottom edge, the federated card's signature.
    Box(
      Modifier.fillMaxWidth().height(5.dp).background(accent.copy(alpha = Theme.accentAlpha(isDark)))
    )
  }
}

@Composable
private fun TypePill(type: String, isDark: Boolean) {
  Text(
    type.replaceFirstChar { it.uppercase() },
    // The badge takes white/90 in dark, exactly as TypeBadge's `dark:text-white/90` does.
    color = if (isDark) Theme.white.copy(alpha = 0.9f) else Theme.inkOn(type),
    fontSize = 11.sp,
    fontWeight = FontWeight.SemiBold,
    modifier =
      Modifier.clip(CircleShape)
        .background(Theme.colourFor(type))
        .padding(horizontal = 8.dp, vertical = 3.dp),
  )
}

// No federated screen carries a badge, so the pill alone says which side of the boundary a
// screenshot was taken on. Purple ties it to the handoff: the same token the Quick Battle
// button wears on the party side.
@Composable
private fun NativeBadge() {
  Text(
    "⟡ NATIVE ANDROID",
    color = Theme.white,
    fontSize = 11.sp,
    fontWeight = FontWeight.Bold,
    modifier =
      Modifier.clip(CircleShape)
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
        .padding(vertical = 15.dp),
  )
}

@Composable
private fun SecondaryButton(title: String, isDark: Boolean, onClick: () -> Unit) {
  Text(
    title,
    color = Theme.actionInk(isDark),
    fontSize = 15.sp,
    fontWeight = FontWeight.SemiBold,
    textAlign = TextAlign.Center,
    modifier =
      Modifier.fillMaxWidth()
        .clip(RoundedCornerShape(14.dp))
        .border(1.dp, Theme.actionInk(isDark).copy(alpha = 0.6f), RoundedCornerShape(14.dp))
        .clickable(onClick = onClick)
        .padding(vertical = 13.dp),
  )
}
