#!/usr/bin/env bash
set -euo pipefail

VERSION="0.1.0"
NAME="Logos-v${VERSION}-Windows-x64-Standalone"

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

echo "=== Logos $VERSION Windows x64 Standalone ==="
echo

echo "[1/7] Validating runtime files..."

for f in \
  manifest.json \
  main.ts \
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
  runtime/node.exe \
  dictionaries/core/logos-dictionary.sqlite3 \
  dictionaries/core/learner-expressions.json
do
  need_file "$f"
done

for d in \
  node_modules/sherpa-onnx-node \
  node_modules/sherpa-onnx-win-x64 \
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

need_file node_modules/sherpa-onnx-win-x64/sherpa-onnx.node
need_file node_modules/sherpa-onnx-win-x64/onnxruntime.dll
need_file node_modules/sherpa-onnx-win-x64/onnxruntime_providers_shared.dll
need_file node_modules/sherpa-onnx-win-x64/sherpa-onnx-c-api.dll
need_file node_modules/sherpa-onnx-win-x64/sherpa-onnx-cxx-api.dll

echo "Runtime requirements OK."
echo

echo "[2/7] Building production main.js..."

./runtime/node.exe esbuild.config.mjs production
need_file main.js

echo "Build OK."
echo

echo "[3/7] Creating clean release tree..."

rm -rf "$STAGE"
rm -f "$ZIP"

mkdir -p "$DEST"

echo "$DEST"
echo

echo "[4/7] Copying plugin runtime..."

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

if [ -d docs ]; then
  cp -a docs "$DEST/"
fi

if [ -f styles.css ]; then
  cp styles.css "$DEST/"
fi

cp dictionary-worker.cjs "$DEST/"
cp kokoro-worker-persistent.cjs "$DEST/"
cp pdf-worker.cjs "$DEST/"
cp vctk-speakers.json "$DEST/"

mkdir -p "$DEST/runtime"
cp runtime/node.exe "$DEST/runtime/"

mkdir -p "$DEST/dictionaries/core"

cp \
  dictionaries/core/logos-dictionary.sqlite3 \
  "$DEST/dictionaries/core/"

cp \
  dictionaries/core/learner-expressions.json \
  "$DEST/dictionaries/core/"

echo "Core files copied."
echo

echo "[5/7] Copying models and runtime dependencies..."

mkdir -p "$DEST/models"
mkdir -p "$DEST/node_modules"

cp -a models/kokoro-en-v0_19 "$DEST/models/"
cp -a models/kokoro-int8-multi-lang-v1_1 "$DEST/models/"
cp -a models/kokoro-multi-lang-v1_0 "$DEST/models/"
cp -a models/kokoro-multi-lang-v1_1 "$DEST/models/"
cp -a models/vits-vctk "$DEST/models/"

cp -a node_modules/sherpa-onnx-node "$DEST/node_modules/"
cp -a node_modules/sherpa-onnx-win-x64 "$DEST/node_modules/"
cp -a node_modules/pdfjs-dist "$DEST/node_modules/"

echo "Models and dependencies copied."
echo

echo "[6/7] Validating staged release..."

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
  "$DEST/docs/INSTALL-WINDOWS.md" \
  "$DEST/docs/INSTALL-MAC.md" \
  "$DEST/docs/TROUBLESHOOTING.md" \
  "$DEST/docs/Logos_User_Manual_English_v0.1.0.pdf" \
  "$DEST/runtime/node.exe" \
  "$DEST/dictionary-worker.cjs" \
  "$DEST/kokoro-worker-persistent.cjs" \
  "$DEST/pdf-worker.cjs" \
  "$DEST/vctk-speakers.json" \
  "$DEST/dictionaries/core/logos-dictionary.sqlite3" \
  "$DEST/dictionaries/core/learner-expressions.json" \
  "$DEST/node_modules/sherpa-onnx-win-x64/sherpa-onnx.node"
do
  need_file "$f"
done

echo "Checking for development-machine paths..."

if grep -RniE \
  '/mnt/c/|C:\\Users\\' \
  "$DEST" \
  --exclude='*.onnx' \
  --exclude='*.bin' \
  --exclude='*.sqlite3' \
  2>/dev/null
then
  fail "Development path found in release."
fi

echo "Checking for development debris..."

BAD_FILES="$(
  find "$DEST" -type f \
    \( \
      -name '*.before-*' \
      -o -name '*.backup' \
      -o -name 'main.ts' \
      -o -name 'test-*.cjs' \
      -o -name 'logos-*.wav' \
    \)
)"

if [ -n "$BAD_FILES" ]; then
  echo "$BAD_FILES"
  fail "Development files found in release."
fi

echo "Staged release OK."
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
        if path.is_file():
            arcname = path.relative_to(stage)
            zf.write(path, arcname)

print(f"Created: {zip_path}")
PYZIP

echo
echo "========================================"
echo " RELEASE COMPLETE"
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
echo "Standalone ZIP:"
echo "$ZIP"
