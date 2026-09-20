// --- Names the bundler replaces with literals at build time, declared for the compiler. They
// are not imports and there is no module behind them: rspack.config.mjs substitutes each one
// during the build, so the shipped bundle contains the value and never the name. ---

/** The version of this remote the build produced, and the CDN directory it was written to. */
declare const __REMOTE_VERSION__: string;
