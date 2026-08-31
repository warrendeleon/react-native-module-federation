#import "ShellNavigationModule.h"
#import <HostSpecs/HostSpecs.h>
// Host-Swift.h declares every @objc Swift class in this app, which is how this ObjC++ file reaches
// QuickBattlePresenter. Imported after the app-delegate header so the generated header's forward
// references resolve in this translation unit.
#import <React-RCTAppDelegate/RCTDefaultReactNativeFactoryDelegate.h>
#import "Host-Swift.h"

// --- The TurboModule implementation. Two things live here and nothing else: the registration
// that puts the module in the registry under the name the spec asked for, and openNative.
//
// openNative is where the promise starts. It hands the resolve block to the presenter and returns
// immediately; the block is called later, from the native screen, whenever that screen finishes.
// Until then the party's `await` is genuinely suspended. That is the whole handoff, and it is also
// the whole risk: a path through the native screen that never calls the block leaves the promise
// pending for the life of the process. ---
@implementation ShellNavigationModule

RCT_EXPORT_MODULE()

- (void)openNative:(NSString *)nativeId
        paramsJson:(NSString *)paramsJson
           resolve:(RCTPromiseResolveBlock)resolve
            reject:(RCTPromiseRejectBlock)reject
{
  [QuickBattlePresenter presentWithNativeId:nativeId
                                 paramsJson:paramsJson
                                 completion:^(NSString *_Nonnull resultJson) {
                                   resolve(resultJson);
                                 }];
}

// The codegen C++ module. This method is the reason the file is ObjC++ rather than Swift: it
// returns a std::shared_ptr, which Swift has no way to express.
- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
  return std::make_shared<facebook::react::NativeShellNavigationModuleSpecJSI>(params);
}

@end
