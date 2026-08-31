#import <Foundation/Foundation.h>
#import <React/RCTBridgeModule.h>
#import <HostSpecs/HostSpecs.h>

// --- The host's native half of shell.navigateTo on iOS. Codegen read specs/
// NativeShellNavigationModule.ts and wrote NativeShellNavigationModuleSpecBase and the
// NativeShellNavigationModuleSpec protocol into HostSpecs; this class subclasses the one and
// conforms to the other, which is what makes the JavaScript `openNative` land here.
//
// The header exists because the implementation is ObjC++ (.mm) rather than Swift: returning the
// generated C++ JSI module from getTurboModule needs C++, and Swift cannot. The screen it
// presents is pure SwiftUI — see QuickBattle.swift. ---
@interface ShellNavigationModule : NativeShellNavigationModuleSpecBase <NativeShellNavigationModuleSpec>
@end
