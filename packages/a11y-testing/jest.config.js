// The bar's own suite runs on plain Node, not the React Native preset: every helper here is
// RN-free by design, so testing them through a native renderer would prove less, not more.
module.exports = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.(ts|tsx)$': ['babel-jest', { presets: [['@babel/preset-env', { targets: { node: 'current' } }], '@babel/preset-typescript'] }],
  },
  testMatch: ['**/__tests__/**/*.test.ts'],
};
