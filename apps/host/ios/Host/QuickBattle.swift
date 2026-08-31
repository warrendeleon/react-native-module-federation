import Foundation
import UIKit
import SwiftUI

// --- The native screen a federated remote reached. No React renders below this line: it is
// SwiftUI, presented by the TurboModule, taking the party as input and handing a winner back.
//
// It wears the federation's design system, which cannot cross to native the way a component
// crosses to a remote — there is no bundle to share — so the tokens are mirrored below and the
// card is rebuilt in SwiftUI to match PokemonCard: the tinted sprite disc, the hashed number, the
// type pills, the accent bar. A reader should not be able to tell which side of the boundary a
// card was drawn on until the badge tells them. ---

// MARK: - Model

private struct Contestant: Identifiable {
  /// The party's own uid, carried across and handed back untouched. Two copies of the same
  /// Pokémon are two contestants, which is why the party stamps a uid rather than battling by
  /// species id.
  let id: String
  let dexNumber: Int
  let name: String
  let spriteUri: String
  let types: [String]

  var primaryType: String { types.first ?? "normal" }
}

// MARK: - Presenter (ObjC++ TurboModule -> SwiftUI)

/// What ShellNavigationModule calls. Decodes the members the shell handed over, presents the
/// SwiftUI screen, and calls `completion` exactly once with a JSON result.
@objc public class QuickBattlePresenter: NSObject {
  /// Re-entrancy guard. UIKit's present() silently does nothing when the host is already
  /// presenting or mid-transition, and a silent no-op here would mean completion never fires and
  /// the party's await hangs for the life of the process. Refuse the second presentation and
  /// settle its promise immediately instead. Main-thread only, so no lock is needed.
  private static var isPresenting = false

  @objc public static func present(
    nativeId: String,
    paramsJson: String,
    completion: @escaping (String) -> Void
  ) {
    let contestants = Self.decodeMembers(paramsJson)
    let isDark = Self.decodeScheme(paramsJson)

    // openNative arrives on the TurboModule's own queue, not the main thread. Every UIKit call
    // below has to be on main, so hop before touching anything.
    DispatchQueue.main.async {
      guard let host = Self.topViewController(), !isPresenting else {
        // Nothing to present from, or one flow already up: settle rather than wedge.
        completion("{}")
        return
      }
      isPresenting = true

      let view = QuickBattleView(contestants: contestants, isDark: isDark) { resultJson in
        host.dismiss(animated: true) {
          isPresenting = false
          completion(resultJson)
        }
      }

      let controller = UIHostingController(rootView: view)
      controller.modalPresentationStyle = .pageSheet
      // Exit only through the screen's own controls. An interactive swipe-to-dismiss would tear
      // the sheet away without reaching the completion above, leaving the promise unsettled.
      controller.isModalInPresentation = true
      host.present(controller, animated: true)
    }
  }

  /// The theme the party was wearing at the moment it called. Sent, not observed: see the note on
  /// QuickBattleParams in the contract.
  private static func decodeScheme(_ paramsJson: String) -> Bool {
    guard let data = paramsJson.data(using: .utf8),
          let obj = try? JSONSerialization.jsonObject(with: data) as? [String: Any]
    else { return false }
    return (obj["colourScheme"] as? String) == "dark"
  }

  private static func decodeMembers(_ paramsJson: String) -> [Contestant] {
    guard let data = paramsJson.data(using: .utf8),
          let obj = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
          let members = obj["members"] as? [[String: Any]]
    else { return [] }
    return members.compactMap { entry in
      guard let uid = entry["uid"] as? String else { return nil }
      return Contestant(
        id: uid,
        dexNumber: (entry["id"] as? Int) ?? 0,
        name: (entry["name"] as? String) ?? "Unknown",
        spriteUri: (entry["spriteUri"] as? String) ?? "",
        types: (entry["types"] as? [String]) ?? []
      )
    }
  }

  private static func topViewController() -> UIViewController? {
    let windows = UIApplication.shared.connectedScenes
      .compactMap { $0 as? UIWindowScene }
      .flatMap { $0.windows }
    var top = windows.first { $0.isKeyWindow }?.rootViewController
    while let presented = top?.presentedViewController { top = presented }
    return top
  }
}

// MARK: - Design tokens

/// Hand-mirrored from packages/ui/src/tokens/colours.ts and typeColours.ts, which name the native
/// side as a consumer. A fuller setup would generate this file from those two; keeping it by hand
/// is the honest cost of a boundary a bundle cannot cross.
private enum Theme {
  static let navy = Color(hex: 0x0F172A)
  static let black = Color(hex: 0x2E3138)
  static let blue = Color(hex: 0x3A86FF)
  // The brand blue is a fill, not an ink: on this dark field it measures 3.74:1, under the 4.5:1
  // small text needs. blueTextDark is the readable pair colours.ts already defines for exactly
  // this surface, and the one the tab bar's active label takes in dark mode.
  static let blueTextDark = Color(hex: 0x79AEFF)
  static let purple = Color(hex: 0x8338EC)
  static let white = Color(hex: 0xFFFFFF)
  static let offWhite = Color(hex: 0xF7F8FC)
  static let offGrey = Color(hex: 0xF0F2F5)
  static let blueText = Color(hex: 0x2065E0)
  static let lightGrey = Color(hex: 0xDBDCE6)
  static let midGrey = Color(hex: 0x9A9AB0)
  static let darkGrey = Color(hex: 0x515151)
  static let typeInk = Color(hex: 0x000000)

  private static let typeHex: [String: UInt] = [
    "normal": 0xC5B1A1, "fire": 0xF78E69, "water": 0x3A86FF, "electric": 0xF7D02C,
    "grass": 0xA6D3A0, "ice": 0xA3D9FF, "fighting": 0x6C0E23, "poison": 0xECB0E1,
    "ground": 0xE2BF65, "flying": 0xF5CAC3, "psychic": 0xE75A7C, "bug": 0xA8A77A,
    "rock": 0x775B59, "ghost": 0x735797, "dragon": 0x6F35FC, "dark": 0x1C2321,
    "steel": 0x797270, "fairy": 0xD685AD,
  ]

  /// The six types whose fill needs white ink; every other type reads better on real black.
  /// Pre-decided in typeColours.ts from relative luminance rather than judged by eye, and copied
  /// as a decision rather than recomputed, so the two sides cannot drift apart quietly.
  private static let whiteInkTypes: Set<String> = ["fighting", "rock", "ghost", "dragon", "dark", "steel"]

  static func colour(for type: String) -> Color {
    Color(hex: typeHex[type.lowercased()] ?? 0x9A9AB0)
  }

  static func ink(on type: String) -> Color {
    whiteInkTypes.contains(type.lowercased()) ? white : typeInk
  }

  // --- The surfaces, mirroring the design system's own dark: rules one for one. ScreenContainer
  // is `bg-offWhite dark:bg-navy`; PokemonCard is `bg-white dark:bg-black` with a white/10 border
  // in dark; its number pill is `bg-offGrey dark:bg-white/10` over `text-darkGrey
  // dark:text-lightGrey`; its name is `text-black dark:text-white`; its accent foot takes
  // `dark:opacity-60`. Read them there, not here, if they ever change. ---

  static func field(_ dark: Bool) -> Color { dark ? navy : offWhite }
  static func cardSurface(_ dark: Bool) -> Color { dark ? black : white }
  static func cardBorder(_ dark: Bool) -> Color { dark ? white.opacity(0.1) : .clear }
  static func pillSurface(_ dark: Bool) -> Color { dark ? white.opacity(0.1) : offGrey }
  static func pillInk(_ dark: Bool) -> Color { dark ? lightGrey : darkGrey }
  static func heading(_ dark: Bool) -> Color { dark ? white : black }
  static func secondary(_ dark: Bool) -> Color { dark ? lightGrey : darkGrey }
  /// The readable blue for each surface. colours.ts carries both because no single blue clears
  /// 4.5:1 on white and on navy.
  static func actionInk(_ dark: Bool) -> Color { dark ? blueTextDark : blueText }
  /// The accent foot and the winner's ring pull back in dark, as the card's own foot does.
  static func accentOpacity(_ dark: Bool) -> Double { dark ? 0.6 : 1 }
}

private extension Color {
  init(hex: UInt) {
    self.init(
      .sRGB,
      red: Double((hex >> 16) & 0xFF) / 255,
      green: Double((hex >> 8) & 0xFF) / 255,
      blue: Double(hex & 0xFF) / 255,
      opacity: 1
    )
  }
}

// MARK: - The badge

/// No federated screen carries a badge, so the pill alone says which side of the boundary a
/// screenshot was taken on. Purple ties it to the handoff: the same token the Quick Battle
/// button wears on the party side.
private struct NativeBadge: View {
  var body: some View {
    HStack(spacing: 6) {
      Image(systemName: "swift")
      Text("NATIVE iOS").font(.caption2.weight(.bold)).tracking(0.8)
    }
    .foregroundColor(.white)
    .padding(.horizontal, 12)
    .padding(.vertical, 6)
    .background(Theme.purple)
    .clipShape(Capsule())
    .shadow(color: Theme.purple.opacity(0.5), radius: 12, y: 4)
  }
}

// MARK: - The card, rebuilt to match PokemonCard

private struct TypePill: View {
  let type: String
  let isDark: Bool
  var body: some View {
    Text(type.capitalized)
      .font(.system(size: 11, weight: .semibold))
      // The badge takes white/90 in dark, exactly as TypeBadge's `dark:text-white/90` does.
      .foregroundColor(isDark ? Theme.white.opacity(0.9) : Theme.ink(on: type))
      .padding(.horizontal, 8)
      .padding(.vertical, 3)
      .background(Theme.colour(for: type))
      .clipShape(Capsule())
  }
}

private struct ContestantCard: View {
  let contestant: Contestant
  let isWinner: Bool
  let hasResult: Bool
  let isDark: Bool

  private var accent: Color { Theme.colour(for: contestant.primaryType) }

  var body: some View {
    VStack(spacing: 0) {
      VStack(spacing: 8) {
        HStack {
          Text("#\(String(format: "%03d", contestant.dexNumber))")
            .font(.system(size: 11, weight: .semibold))
            .foregroundColor(Theme.pillInk(isDark))
            .padding(.horizontal, 8)
            .padding(.vertical, 3)
            .background(Theme.pillSurface(isDark))
            .clipShape(Capsule())
          Spacer()
          // The trophy takes the slot the remove button holds on the federated card, so the
          // winner's crown lands where the eye already expects a corner mark.
          if isWinner {
            Text("🏆").font(.system(size: 18))
          }
        }

        ZStack {
          // The sprite sits on its primary type at 30%, the same tint the Pokédex grid uses, so
          // the disc reads as the same component rather than a lookalike.
          Circle().fill(accent.opacity(0.3)).frame(width: 92, height: 92)
          SpriteImage(uri: contestant.spriteUri).frame(width: 74, height: 74)
        }

        Text(contestant.name)
          .font(.system(size: 15, weight: .bold))
          .foregroundColor(Theme.heading(isDark))
          .lineLimit(1)
          .minimumScaleFactor(0.8)

        HStack(spacing: 4) {
          ForEach(contestant.types.prefix(2), id: \.self) { TypePill(type: $0, isDark: isDark) }
        }
        .frame(height: 20)
      }
      .padding(.horizontal, 12)
      .padding(.top, 12)
      .padding(.bottom, 10)

      // The accent bar along the bottom edge, the federated card's signature.
      Rectangle().fill(accent.opacity(Theme.accentOpacity(isDark))).frame(height: 5)
    }
    .background(Theme.cardSurface(isDark))
    .clipShape(RoundedRectangle(cornerRadius: 18))
    .overlay(
      // The winner is ringed in its own type colour rather than a generic highlight, so the
      // result is legible at a glance and stays inside the palette. Unringed, the card still
      // takes the hairline border PokemonCard wears in dark mode.
      RoundedRectangle(cornerRadius: 18)
        .stroke(
          isWinner ? accent.opacity(Theme.accentOpacity(isDark)) : Theme.cardBorder(isDark),
          lineWidth: isWinner ? 3 : 1
        )
    )
    // The winner's halo is the card's own shadow, not a light behind the grid. An earlier version
    // put a radial gradient under the whole row and it lit the loser as brightly as the winner,
    // which is the opposite of what a result should say. Tied to the card, it falls off inside
    // the gutter and cannot reach its neighbour.
    .shadow(color: isWinner ? accent.opacity(0.75) : .black.opacity(isDark ? 0.35 : 0.12),
            radius: isWinner ? 14 : 8, y: isWinner ? 6 : 4)
    .scaleEffect(isWinner ? 1.04 : 1)
    // Losers recede rather than disappear: the comparison is the point, so they stay readable.
    .opacity(hasResult && !isWinner ? 0.55 : 1)
  }
}

/// Sprites arrive as PokéAPI URLs in the party payload. AsyncImage is the platform's own loader,
/// so the screen needs no image dependency to render what the federated cards render.
private struct SpriteImage: View {
  let uri: String
  var body: some View {
    if let url = URL(string: uri), !uri.isEmpty {
      AsyncImage(url: url) { phase in
        switch phase {
        case .success(let image):
          image.resizable().interpolation(.medium).scaledToFit()
        case .failure:
          Image(systemName: "questionmark.circle").foregroundColor(Theme.midGrey)
        default:
          ProgressView().tint(Theme.midGrey)
        }
      }
    } else {
      Image(systemName: "questionmark.circle").foregroundColor(Theme.midGrey)
    }
  }
}

// MARK: - Buttons

private struct PrimaryButton: View {
  let title: String
  let action: () -> Void
  var body: some View {
    Button(action: action) {
      Text(title)
        .font(.system(size: 17, weight: .bold))
        .foregroundColor(.white)
        .frame(maxWidth: .infinity)
        .padding(.vertical, 15)
        .background(Theme.blue)
        .clipShape(RoundedRectangle(cornerRadius: 14))
        .shadow(color: Theme.blue.opacity(0.45), radius: 14, y: 6)
    }
  }
}

private struct SecondaryButton: View {
  let title: String
  let isDark: Bool
  let action: () -> Void
  var body: some View {
    Button(action: action) {
      Text(title)
        .font(.system(size: 15, weight: .semibold))
        .foregroundColor(Theme.actionInk(isDark))
        .frame(maxWidth: .infinity)
        .padding(.vertical, 13)
        .overlay(RoundedRectangle(cornerRadius: 14).stroke(Theme.actionInk(isDark).opacity(0.6), lineWidth: 1))
    }
  }
}

// MARK: - The screen

private struct QuickBattleView: View {
  let contestants: [Contestant]
  let isDark: Bool
  let onDone: (String) -> Void

  @State private var winnerId: String?

  private var winner: Contestant? {
    guard let winnerId else { return nil }
    return contestants.first { $0.id == winnerId }
  }

  private let columns = [GridItem(.flexible(), spacing: 12), GridItem(.flexible(), spacing: 12)]

  var body: some View {
    ZStack {
      // The field the party was on: offWhite in light, navy in dark, the same pair
      // ScreenContainer resolves for every federated screen.
      Theme.field(isDark).ignoresSafeArea()

      ScrollView {
        VStack(spacing: 20) {
          NativeBadge().padding(.top, 10)

          VStack(spacing: 4) {
            Text("Quick Battle")
              .font(.system(size: 30, weight: .heavy))
              .foregroundColor(Theme.heading(isDark))
            Text(winner == nil
                 ? "\(contestants.count) in your party"
                 : "\(winner!.name) takes it")
              .font(.system(size: 14, weight: .medium))
              .foregroundColor(Theme.secondary(isDark))
          }

          LazyVGrid(columns: columns, spacing: 12) {
            ForEach(contestants) { c in
              ContestantCard(
                contestant: c,
                isWinner: winnerId == c.id,
                hasResult: winnerId != nil,
                isDark: isDark
              )
            }
          }

          if let w = winner {
            HStack(spacing: 8) {
              Text("🏆").font(.system(size: 22))
              Text("\(w.name) wins!")
                .font(.system(size: 22, weight: .heavy))
                .foregroundColor(Theme.heading(isDark))
            }
            .transition(.scale.combined(with: .opacity))
          }

          VStack(spacing: 10) {
            PrimaryButton(title: winnerId == nil ? "Battle!" : "Battle again") {
              // A spring rather than a fade: the winner's card lifts into place, which is the
              // one moment of motion the screen gets and the reason it reads as a result.
              withAnimation(.spring(response: 0.45, dampingFraction: 0.62)) {
                winnerId = contestants.randomElement()?.id
              }
            }
            // Both exits settle the promise. Done after a battle carries the winner; Close
            // before one carries an empty object, which is a real outcome and not an error —
            // the party reads a missing winnerUid as "nothing happened".
            SecondaryButton(title: winnerId == nil ? "Close" : "Done", isDark: isDark) { finish() }
          }
          .padding(.top, 4)
        }
        .padding(20)
      }
    }
  }

  private func finish() {
    guard let winnerId else {
      onDone("{}")
      return
    }
    let json = (try? JSONSerialization.data(withJSONObject: ["winnerUid": winnerId]))
      .flatMap { String(data: $0, encoding: .utf8) } ?? "{}"
    onDone(json)
  }
}
