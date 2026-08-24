// Reanimated drives animations from the UI thread through the JSI, and a Jest process has no JSI.
// Its two implementations both refuse to load here: the `.native` one asks for a native worklets
// runtime, the plain one asks for a DOM. So the module is replaced wholesale for tests.
//
// This keeps the smoke test honest about what it claims: the shell mounts and every screen
// renders. It does not claim a spring interpolates — that is verified on a simulator, not here.
// The surface below is exactly what this repo imports; anything new will fail loudly as
// undefined rather than silently no-op.
const { View, ScrollView, FlatList } = require('react-native');

// Entering/exiting animation builders are chainable and their return value is only ever handed
// back to reanimated, so a self-returning stub is a faithful stand-in.
const builder = {};
for (const method of ['duration', 'delay', 'springify', 'damping', 'stiffness', 'build']) {
  builder[method] = () => builder;
}

const identity = value => value;

module.exports = {
  __esModule: true,
  default: {
    View,
    ScrollView,
    FlatList,
    createAnimatedComponent: component => component,
  },
  useSharedValue: initial => ({ value: initial }),
  useAnimatedStyle: () => ({}),
  useAnimatedScrollHandler: () => () => {},
  withSpring: identity,
  withTiming: identity,
  withDelay: (_delay, animation) => animation,
  interpolate: () => 0,
  Extrapolation: { CLAMP: 'clamp', EXTEND: 'extend', IDENTITY: 'identity' },
  FadeOut: builder,
  FadeInDown: builder,
  FadeOutDown: builder,
};
