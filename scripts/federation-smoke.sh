#!/bin/sh
# Federation build smoke test: run the three Re.Pack production builds and prove the pieces
# federation needs actually come out — each remote's container and manifest, and the host
# bundle. Shared-map and exposed-module mistakes fail here at build time instead of waiting
# for a simulator session. Run from the repo root; exits non-zero on the first miss.
set -e

OUT=$(mktemp -d)
trap 'rm -rf "$OUT"' EXIT

bundle() {
  app=$1
  echo "== bundling $app =="
  ( cd "apps/$app" && npx react-native webpack-bundle \
      --platform ios --dev false --entry-file index.js \
      --bundle-output "$OUT/$app/main.jsbundle" --assets-dest "$OUT/$app-assets" \
      --config rspack.config.mjs ) > "$OUT/$app.log" 2>&1 \
    || { echo "✖ $app build failed"; tail -25 "$OUT/$app.log"; exit 1; }
}

mkdir -p "$OUT/list" "$OUT/party" "$OUT/host"
bundle list
bundle party
bundle host

# Re.Pack writes federation artefacts to each app's build/<platform>/ (the rspack output
# path), not to the CLI's bundle-output; the host's plain bundle goes where the CLI says.
fail=0
check() {
  if [ -e "$1" ]; then echo "✔ $1"; else echo "✖ missing: $1"; fail=1; fi
}
check apps/list/build/ios/listApp.container.js.bundle
check apps/list/build/ios/mf-manifest.json
check apps/party/build/ios/partyApp.container.js.bundle
check apps/party/build/ios/mf-manifest.json
check "$OUT/host/main.jsbundle"
exit $fail
