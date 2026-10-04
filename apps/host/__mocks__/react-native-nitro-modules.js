// --- Stands in for react-native-nitro-modules under Jest.
//
// react-native-mmkv, the host's storage, is built on Nitro. MMKV itself notices a test process and
// keeps its values in memory, so nothing the host stores ever reaches a native side here. But
// importing MMKV imports Nitro, and Nitro looks its native module up the moment it loads, and
// throws when there is none, which is before MMKV gets to notice anything. So Nitro is replaced
// with the one export MMKV's test path still names and never calls. Reaching it would mean MMKV
// stopped noticing Jest, and the error says so rather than failing somewhere less clear. ---
module.exports = {
  NitroModules: {
    createHybridObject(name) {
      throw new Error(
        `${name} was asked of Nitro under Jest, where MMKV should have used its in-memory stand-in`,
      );
    },
  },
};
