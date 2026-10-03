#!/usr/bin/env bash
# --- The copy in the binary, iOS's half. The last Run Script phase of the Host target copies each
# remote's embedded version from embed-root/ios into the app, at cdn/ios/<remote>/<version>/ next
# to main.jsbundle, where the host reads it through absolute file:// URLs: the signed bundles and
# the version's mf-manifest.json.
#
# The <remote>/<version>/ directories are kept rather than flattened: two remotes can ship vendor
# chunks with the same file name, and a flat copy would let one overwrite the other.
#
# It runs in every configuration. A Debug build loads the host's own bundle over http, so it cannot
# read the copy, and there the copy only costs the time it takes. Its remotes come from the dev
# servers when no CDN is configured, or from the CDN when one is.
#
# With embed-root missing it removes any copy an earlier build left behind, prints a warning and
# exits 0, and the build succeeds with nothing embedded. That is the trap: run
# `node tools/build-cdn.mjs` before a release build. ---
set -euo pipefail

REPO_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)
SOURCE="$REPO_DIR/embed-root/ios"
: "${CONFIGURATION_BUILD_DIR:?run this from an Xcode build phase}"
: "${UNLOCALIZED_RESOURCES_FOLDER_PATH:?run this from an Xcode build phase}"
DEST="$CONFIGURATION_BUILD_DIR/$UNLOCALIZED_RESOURCES_FOLDER_PATH/cdn/ios"

if [ ! -d "$SOURCE" ]; then
  rm -rf "$DEST"
  rmdir "$(dirname "$DEST")" 2>/dev/null || true
  echo "warning: $SOURCE does not exist, so no remotes are embedded. Run 'node tools/build-cdn.mjs' before a release build."
  exit 0
fi

mkdir -p "$DEST"
# --delete keeps the app to exactly what embed-root holds, so a version an earlier build embedded
# does not linger. The bytes are copied as they are: each bundle is signed over them.
rsync -a --delete --include='*/' --include='*.bundle' --include='mf-manifest.json' --exclude='*' "$SOURCE/" "$DEST/"
echo "embedded $(find "$DEST" -name '*.bundle' | wc -l | tr -d ' ') remote bundles and $(find "$DEST" -name 'mf-manifest.json' | wc -l | tr -d ' ') manifests into $DEST"
