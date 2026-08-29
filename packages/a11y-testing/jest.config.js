// The bar's own suite runs on plain Node, not the React Native preset: every helper here is
// RN-free by design, so testing them through a native renderer would prove less, not more.
module.exports = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.(ts|tsx)$': ['babel-jest', { presets: [['@babel/preset-env', { targets: { node: 'current' } }], '@babel/preset-typescript'] }],
  },
  // .tsx as well as .ts: the pattern was .ts only, so a suite for render.tsx could not have been
  // collected even if one existed. It still has none — this package's environment is `node` and
  // cannot import nativewind/test, so createThemedRender is exercised only through the four
  // consumer suites that call it, and never for the class resolution its name implies.
  testMatch: ['**/__tests__/**/*.test.ts?(x)'],
};
