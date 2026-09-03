import XCTest
import UIKit

// --- The presenter's guard contract, pinned where a simulator run cannot hold it. The bundle
// compiles QuickBattle.swift directly rather than loading the app, so these tests are hermetic:
// no React Native boot, no dev server, no window hierarchy. What is provable here is the guard
// logic — the nil-host settle, the re-entrancy settle, the refused-presentation net, and that
// every one of them settles exactly once. The winner's happy path stays a simulator exercise,
// because tapping SwiftUI is not this bundle's job. ---
final class QuickBattlePresenterTests: XCTestCase {

  override func setUp() {
    super.setUp()
    QuickBattlePresenter.isPresenting = false
  }

  override func tearDown() {
    QuickBattlePresenter.hostProvider = { nil }
    QuickBattlePresenter.isPresenting = false
    super.tearDown()
  }

  func test_noHost_settlesEmptyExactlyOnce() {
    QuickBattlePresenter.hostProvider = { nil }
    let settled = expectation(description: "settled")
    settled.assertForOverFulfill = true
    QuickBattlePresenter.present(nativeId: "quickBattle", paramsJson: "{}") { result in
      XCTAssertEqual(result, "{}")
      settled.fulfill()
    }
    wait(for: [settled], timeout: 2)
    XCTAssertFalse(QuickBattlePresenter.isPresenting)
  }

  func test_secondCallWhileOpen_settlesEmptyAndLeavesTheFlagAlone() {
    QuickBattlePresenter.hostProvider = { UIViewController() }
    QuickBattlePresenter.isPresenting = true
    let settled = expectation(description: "settled")
    settled.assertForOverFulfill = true
    QuickBattlePresenter.present(nativeId: "quickBattle", paramsJson: "{}") { result in
      XCTAssertEqual(result, "{}")
      settled.fulfill()
    }
    wait(for: [settled], timeout: 2)
    // The refusal must not clear the live flow's flag: that flow still owns it.
    XCTAssertTrue(QuickBattlePresenter.isPresenting)
  }

  func test_refusedPresentation_isSettledByTheNilCheckNet() {
    // A controller in no window: UIKit refuses the presentation, and whether it runs any
    // completion is exactly what the net was rebuilt not to depend on. One main-queue turn
    // later presentingViewController is still nil, and the wrapper settles.
    QuickBattlePresenter.hostProvider = { UIViewController() }
    let settled = expectation(description: "settled")
    settled.assertForOverFulfill = true
    QuickBattlePresenter.present(nativeId: "quickBattle", paramsJson: "{}") { result in
      XCTAssertEqual(result, "{}")
      settled.fulfill()
    }
    wait(for: [settled], timeout: 3)
    XCTAssertFalse(QuickBattlePresenter.isPresenting)
  }
}
