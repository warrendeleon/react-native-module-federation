// Reanimated drives animations from the UI thread through the JSI, and a Jest process has no JSI.
// Its two implementations both refuse to load here: the `.native` one asks for a native worklets
// runtime, the plain one asks for a DOM. So the module is replaced wholesale for tests.
//
// The stand-in does slightly more than mount: style worklets run as plain functions against
// stable {value} boxes, so a test can drive a shared value, re-render, and read the style the
// worklet computes. What no test here claims is that a spring interpolates per frame; that is
// verified on a simulator. The surface below is exactly what this repo imports; anything new
// will fail loudly as undefined rather than silently no-op.
const React = require('react');
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
  // One stable {value} box per hook call site, like the real hook: a fresh object per
  // render would reset the value every time a test re-renders.
  useSharedValue: initial => React.useRef({ value: initial }).current,
  // Evaluate the style worklet as a plain function: shared values are {value} objects here,
  // so a test can drive the value, re-render, and read the style the worklet computes.
  useAnimatedStyle: factory => factory(),
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
