#!/bin/sh
# Federation build smoke test: run the three Re.Pack production builds and prove the pieces
# federation needs actually come out — each remote's container and manifest, and the host
# bundle. Shared-map and exposed-module mistakes fail here at build time instead of waiting
# for a simulator session. Run from the repo root; exits non-zero on the first miss.
set -e

# The remotes are built at a version that is deliberately not any config's default, so the checks
# below prove the version reached the output path rather than passing on a value the build would
# have used anyway.
SMOKE_VERSION=9.9.9

OUT=$(mktemp -d)
trap 'rm -rf "$OUT"' EXIT

bundle() {
  app=$1
  echo "== bundling $app =="
  # Clear the previous run's artefacts first: a stale container from an earlier build
  # would satisfy the existence checks below and hide a build that now fails. Both output
  # trees go, because a remote's production build writes to cdn/ and the host's to build/.
  rm -rf "apps/$app/build" "apps/$app/cdn"
  ( cd "apps/$app" && MF_REMOTE_VERSION="$SMOKE_VERSION" npx react-native webpack-bundle \
      --platform ios --dev false --entry-file index.js \
      --bundle-output "$OUT/$app/main.jsbundle" --assets-dest "$OUT/$app-assets" \
      --config rspack.config.mjs ) > "$OUT/$app.log" 2>&1 \
    || { echo "✖ $app build failed"; tail -25 "$OUT/$app.log"; exit 1; }
}

mkdir -p "$OUT/list" "$OUT/party" "$OUT/host"
bundle list
bundle party
bundle host

# Re.Pack writes federation artefacts to the rspack output path, not to the CLI's
# bundle-output. These are production builds, so each remote's artefacts land in
# cdn/<platform>/<remote>/<version>/, the tree tools/build-cdn.mjs collects; the host's plain
# bundle goes where the CLI says.
fail=0
check() {
  # -s: the file must exist AND be non-empty — an empty artefact is a failed build too.
  if [ -s "$1" ]; then echo "✔ $1"; else echo "✖ missing or empty: $1"; fail=1; fi
}
check "apps/list/cdn/ios/listApp/$SMOKE_VERSION/listApp.container.js.bundle"
check "apps/list/cdn/ios/listApp/$SMOKE_VERSION/mf-manifest.json"
check "apps/party/cdn/ios/partyApp/$SMOKE_VERSION/partyApp.container.js.bundle"
check "apps/party/cdn/ios/partyApp/$SMOKE_VERSION/mf-manifest.json"
check "$OUT/host/main.jsbundle"

# The manifest's own chunk list is followed into the version directory, so a build whose output
# path lost its version segment fails here rather than at a user's launch. (The extraChunks
# outputPath only copies the chunks, so a segment missing there leaves stray copies, not a
# failure, and this check does not see it.) The chunk list is read first and checked for
# emptiness, because a manifest that cannot be read would otherwise make the loop below run zero
# times and say nothing.
chunks=$(node -e "
  const m = require('./apps/list/cdn/ios/listApp/$SMOKE_VERSION/mf-manifest.json');
  console.log(m.exposes.flatMap(e => e.assets.js.sync).join(' '));
" 2>/dev/null) || chunks=""
if [ -z "$chunks" ]; then
  echo "✖ could not read the exposed chunk list out of listApp's manifest"
  fail=1
else
  for chunk in $chunks; do
    check "apps/list/cdn/ios/listApp/$SMOKE_VERSION/$chunk"
  done
fi
exit $fail
