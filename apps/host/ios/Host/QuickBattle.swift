import Foundation
import UIKit
import SwiftUI

// --- The native screen a federated remote reached. No React renders below this line: it is
// SwiftUI, presented by the TurboModule, taking the party as input and handing a winner back.
//
// The party app that started it knows none of this. It called one function from the contract and
// awaited a promise. ---

// MARK: - Model

private struct Contestant: Identifiable {
  /// The party's own uid, carried across and handed back untouched. Two copies of the same
  /// Pokémon are two contestants, which is exactly why the party stamps a uid rather than
  /// battling by species id.
  let id: String
  let name: String
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

    // openNative arrives on the TurboModule's own queue, not the main thread. Every UIKit call
    // below has to be on main, so hop before touching anything.
    DispatchQueue.main.async {
      guard let host = Self.topViewController(), !isPresenting else {
        // Nothing to present from, or one flow already up: settle rather than wedge.
        completion("{}")
        return
      }
      isPresenting = true

      let view = QuickBattleView(contestants: contestants) { resultJson in
        host.dismiss(animated: true) {
          isPresenting = false
          completion(resultJson)
        }
      }

      let controller = UIHostingController(rootView: view)
      controller.modalPresentationStyle = .pageSheet
      // Exit only through Done. An interactive swipe-to-dismiss would tear the sheet away without
      // ever reaching the completion above, and the promise behind it would never settle.
      controller.isModalInPresentation = true
      host.present(controller, animated: true)
    }
  }

  private static func decodeMembers(_ paramsJson: String) -> [Contestant] {
    guard let data = paramsJson.data(using: .utf8),
          let obj = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
          let members = obj["members"] as? [[String: Any]]
    else { return [] }
    return members.compactMap { entry in
      guard let uid = entry["uid"] as? String else { return nil }
      return Contestant(id: uid, name: (entry["name"] as? String) ?? "Unknown")
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

/// Hand-mirrored from packages/ui/src/tokens/colours.ts. The design system cannot cross to native
/// the way it crosses to a remote — there is no bundle to share — so the native screen carries its
/// own copy of the values and a fuller setup would generate this file from that same source.
private enum Theme {
  static let navy = Color(hex: 0x0F172A)
  static let blue = Color(hex: 0x3A86FF)
  static let purple = Color(hex: 0x8338EC)
  static let midGrey = Color(hex: 0x9A9AB0)
  static let black = Color(hex: 0x2E3138)
  static let pokemonGreen = Color(hex: 0x9BE89B)
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

/// Purple, a token the app's chrome uses nowhere else, so a screenshot says on its own which side
/// of the boundary it was taken on. The federated screens carry no badge; the pill is the tell.
private struct NativeBadge: View {
  var body: some View {
    HStack(spacing: 6) {
      Image(systemName: "swift")
      Text("NATIVE iOS").font(.caption2.weight(.bold)).tracking(0.5)
    }
    .foregroundColor(.white)
    .padding(.horizontal, 12)
    .padding(.vertical, 6)
    .background(Theme.purple)
    .clipShape(Capsule())
  }
}

private struct PrimaryButton: View {
  let title: String
  let action: () -> Void
  var body: some View {
    Button(action: action) {
      Text(title)
        .font(.headline)
        .foregroundColor(.white)
        .frame(maxWidth: .infinity)
        .padding(.vertical, 14)
        .background(Theme.blue)
        .clipShape(RoundedRectangle(cornerRadius: 14))
    }
  }
}

// MARK: - The screen

private struct QuickBattleView: View {
  let contestants: [Contestant]
  let onDone: (String) -> Void

  @State private var winnerId: String?

  var body: some View {
    ZStack {
      Theme.navy.ignoresSafeArea()
      ScrollView {
        VStack(spacing: 18) {
          NativeBadge().padding(.top, 8)

          Text("Quick Battle")
            .font(.title2.bold())
            .foregroundColor(.white)

          VStack(spacing: 10) {
            ForEach(contestants) { c in
              HStack {
                Text(c.name).font(.headline).foregroundColor(Theme.black)
                Spacer()
                if winnerId == c.id { Text("🏆").font(.title3) }
              }
              .padding(.horizontal, 16)
              .padding(.vertical, 14)
              .background(winnerId == c.id ? Theme.pokemonGreen : Color.white)
              .clipShape(RoundedRectangle(cornerRadius: 16))
            }
          }

          if let id = winnerId, let w = contestants.first(where: { $0.id == id }) {
            Text("\(w.name) wins!")
              .font(.title3.bold())
              .foregroundColor(.white)
          }

          PrimaryButton(title: winnerId == nil ? "Battle!" : "Battle again") {
            winnerId = contestants.randomElement()?.id
          }

          // Both exits settle the promise. Done after a battle carries the winner; Close before
          // one carries an empty object, which is a real outcome and not an error — the party
          // reads a missing winnerUid as "nothing happened" and leaves its banner alone.
          Button(winnerId == nil ? "Close" : "Done") { finish() }
            .font(.subheadline.weight(.semibold))
            .foregroundColor(Theme.blue)
            .padding(.top, 4)
        }
        .padding(24)
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
