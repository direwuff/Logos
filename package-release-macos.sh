#!/usr/bin/env bash
set -euo pipefail

VERSION="0.1.0"
NAME="Logos-v${VERSION}-macOS-Universal-Standalone"

PLUGIN_DIR="$(pwd)"
LOGOS_ROOT="$(cd "$PLUGIN_DIR/../../.." && pwd)"
RELEASE_ROOT="$LOGOS_ROOT/releases"

STAGE="$RELEASE_ROOT/$NAME"
DEST="$STAGE/logos"
ZIP="$RELEASE_ROOT/$NAME.zip"

fail() {
  echo "ERROR: $1" >&2
  exit 1
}

need_file() {
  [ -f "$1" ] || fail "Missing file: $1"
}

need_dir() {
  [ -d "$1" ] || fail "Missing directory: $1"
}

echo "=== Logos $VERSION macOS Universal Standalone ==="
echo

echo "[1/7] Validating Mac runtime..."

for f in \
  manifest.json \
  main.ts \
  main.js \
  README.md \
  LICENSE \
  THIRD_PARTY_NOTICES.md \
  CHANGELOG.md \
  CONTRIBUTING.md \
  SECURITY.md \
  AUTHORS.md \
  CREDITS.md \
  dictionary-worker.cjs \
  kokoro-worker-persistent.cjs \
  pdf-worker.cjs \
  vctk-speakers.json \
  mac-runtime/darwin-arm64/node \
  mac-runtime/darwin-x64/node \
  mac-native/arm64/sherpa-onnx.node \
  mac-native/x64/sherpa-onnx.node \
  dictionaries/core/logos-dictionary.sqlite3 \
  dictionaries/core/learner-expressions.json
do
  need_file "$f"
done

for d in \
  node_modules/sherpa-onnx-node \
  node_modules/pdfjs-dist \
  models/kokoro-en-v0_19 \
  models/kokoro-int8-multi-lang-v1_1 \
  models/kokoro-multi-lang-v1_0 \
  models/kokoro-multi-lang-v1_1 \
  models/vits-vctk
do
  need_dir "$d"
done

for d in \
  models/kokoro-en-v0_19 \
  models/kokoro-int8-multi-lang-v1_1 \
  models/kokoro-multi-lang-v1_0 \
  models/kokoro-multi-lang-v1_1
do
  need_dir "$d/espeak-ng-data"
done

echo "Mac runtime requirements OK."
echo

echo "[2/7] Building production main.js..."

./runtime/node.exe esbuild.config.mjs production
need_file main.js

echo "Build OK."
echo

echo "[3/7] Creating clean Mac release tree..."

rm -rf "$STAGE"
rm -f "$ZIP"

mkdir -p "$DEST"

echo "$DEST"
echo

echo "[4/7] Copying Logos core..."

cp manifest.json "$DEST/"
cp main.js "$DEST/"

cp \
  README.md \
  LICENSE \
  THIRD_PARTY_NOTICES.md \
  CHANGELOG.md \
  CONTRIBUTING.md \
  SECURITY.md \
  AUTHORS.md \
  CREDITS.md \
  "$DEST/"

if [ -d licenses ]; then
  cp -a licenses "$DEST/"
fi

if [ -f styles.css ]; then
  cp styles.css "$DEST/"
fi

cp dictionary-worker.cjs "$DEST/"
cp kokoro-worker-persistent.cjs "$DEST/"
cp pdf-worker.cjs "$DEST/"
cp vctk-speakers.json "$DEST/"

mkdir -p "$DEST/dictionaries/core"

cp \
  dictionaries/core/logos-dictionary.sqlite3 \
  "$DEST/dictionaries/core/"

cp \
  dictionaries/core/learner-expressions.json \
  "$DEST/dictionaries/core/"

echo "Core files copied."
echo

echo "[5/7] Copying Mac runtimes, models, and dependencies..."

mkdir -p \
  "$DEST/runtime/darwin-arm64" \
  "$DEST/runtime/darwin-x64" \
  "$DEST/node_modules" \
  "$DEST/models"

cp \
  mac-runtime/darwin-arm64/node \
  "$DEST/runtime/darwin-arm64/node"

cp \
  mac-runtime/darwin-x64/node \
  "$DEST/runtime/darwin-x64/node"

chmod 755 \
  "$DEST/runtime/darwin-arm64/node" \
  "$DEST/runtime/darwin-x64/node"

cp -a \
  node_modules/sherpa-onnx-node \
  "$DEST/node_modules/"

cp -a \
  node_modules/pdfjs-dist \
  "$DEST/node_modules/"

cp -a \
  mac-native/arm64 \
  "$DEST/node_modules/sherpa-onnx-darwin-arm64"

cp -a \
  mac-native/x64 \
  "$DEST/node_modules/sherpa-onnx-darwin-x64"

cp -a \
  models/kokoro-en-v0_19 \
  "$DEST/models/"

cp -a \
  models/kokoro-int8-multi-lang-v1_1 \
  "$DEST/models/"

cp -a \
  models/kokoro-multi-lang-v1_0 \
  "$DEST/models/"

cp -a \
  models/kokoro-multi-lang-v1_1 \
  "$DEST/models/"

cp -a \
  models/vits-vctk \
  "$DEST/models/"

echo "Mac runtime payload copied."
echo

echo "[6/7] Validating staged Mac release..."

for f in \
  "$DEST/main.js" \
  "$DEST/manifest.json" \
  "$DEST/README.md" \
  "$DEST/LICENSE" \
  "$DEST/THIRD_PARTY_NOTICES.md" \
  "$DEST/CHANGELOG.md" \
  "$DEST/CONTRIBUTING.md" \
  "$DEST/SECURITY.md" \
  "$DEST/AUTHORS.md" \
  "$DEST/CREDITS.md" \
  "$DEST/licenses/README.md" \
  "$DEST/runtime/darwin-arm64/node" \
  "$DEST/runtime/darwin-x64/node" \
  "$DEST/node_modules/sherpa-onnx-darwin-arm64/sherpa-onnx.node" \
  "$DEST/node_modules/sherpa-onnx-darwin-x64/sherpa-onnx.node" \
  "$DEST/dictionary-worker.cjs" \
  "$DEST/kokoro-worker-persistent.cjs" \
  "$DEST/pdf-worker.cjs" \
  "$DEST/vctk-speakers.json"
do
  need_file "$f"
done

echo "Checking for Windows-only runtime files..."

if find "$DEST" -type f \
  \( \
    -name 'node.exe' \
    -o -name '*.dll' \
  \) | grep -q .
then
  find "$DEST" -type f \
    \( \
      -name 'node.exe' \
      -o -name '*.dll' \
    \)
  fail "Windows-only runtime files found in Mac release."
fi

echo "Checking for development-machine paths..."

if grep -RniE \
  '/mnt/c/|C:\\Users\\' \
  "$DEST" \
  --exclude='*.onnx' \
  --exclude='*.bin' \
  --exclude='*.sqlite3' \
  2>/dev/null
then
  fail "Development-machine path found."
fi

echo "Mac staged release OK."
echo

echo "[7/7] Creating ZIP..."

python3 - "$STAGE" "$ZIP" <<'PYZIP'
from pathlib import Path
import sys
import zipfile

stage = Path(sys.argv[1])
zip_path = Path(sys.argv[2])

with zipfile.ZipFile(
    zip_path,
    "w",
    compression=zipfile.ZIP_DEFLATED,
    compresslevel=6
) as zf:

    for path in sorted(stage.rglob("*")):
        if not path.is_file():
            continue

        arcname = path.relative_to(stage)

        info = zipfile.ZipInfo.from_file(
            path,
            arcname
        )

        # Preserve Unix executable permissions.
        mode = path.stat().st_mode
        info.external_attr = (mode & 0xFFFF) << 16

        with path.open("rb") as src:
            data = src.read()

        zf.writestr(
            info,
            data,
            compress_type=zipfile.ZIP_DEFLATED,
            compresslevel=6
        )

print(f"Created: {zip_path}")
PYZIP

echo
echo "========================================"
echo " MAC RELEASE COMPLETE"
echo "========================================"
echo

echo "Release directory:"
du -sh "$DEST"

echo
echo "ZIP:"
ls -lh "$ZIP"

echo
echo "SHA256:"
sha256sum "$ZIP"

echo
echo "Files:"
find "$DEST" -type f | wc -l

echo
echo "Standalone Mac ZIP:"
echo "$ZIP"
