#!/usr/bin/env bash
set -euo pipefail

ROOT="${1:-$(pwd)}"
OUT="$ROOT/licenses"

mkdir -p "$OUT"

copy_first() {
  local dest="$1"
  shift
  for f in "$@"; do
    if [[ -f "$f" ]]; then
      cp -f "$f" "$OUT/$dest"
      echo "Copied: $f -> licenses/$dest"
      return 0
    fi
  done
  echo "NOTICE: could not find source file for licenses/$dest"
  return 0
}

# sherpa-onnx package notices, if present locally
copy_first "SHERPA-ONNX-LICENSE.txt" \
  "$ROOT/node_modules/sherpa-onnx-node/LICENSE" \
  "$ROOT/node_modules/sherpa-onnx-node/LICENSE.txt" \
  "$ROOT/node_modules/sherpa-onnx-win-x64/LICENSE" \
  "$ROOT/node_modules/sherpa-onnx-win-x64/LICENSE.txt"

# PDF.js
copy_first "PDFJS-LICENSE.txt" \
  "$ROOT/node_modules/pdfjs-dist/LICENSE" \
  "$ROOT/node_modules/pdfjs-dist/LICENSE.txt"

# lamejs fork
copy_first "LAMEJS-LICENSE.txt" \
  "$ROOT/node_modules/@breezystack/lamejs/LICENSE" \
  "$ROOT/node_modules/@breezystack/lamejs/LICENSE.txt" \
  "$ROOT/node_modules/@breezystack/lamejs/COPYING"

# Model licenses and model cards
for model in \
  kokoro-en-v0_19 \
  kokoro-int8-multi-lang-v1_1 \
  kokoro-multi-lang-v1_0 \
  kokoro-multi-lang-v1_1 \
  vits-vctk
do
  if [[ -d "$ROOT/models/$model" ]]; then
    mkdir -p "$OUT/models/$model"
    find "$ROOT/models/$model" -maxdepth 1 -type f \
      \( -iname 'LICENSE*' -o -iname 'NOTICE*' -o -iname 'COPYING*' -o -iname 'README*' \) \
      -exec cp -f {} "$OUT/models/$model/" \;
    echo "Collected notices for model: $model"
  fi
done

cat > "$OUT/README.md" <<'EOF'
# Third-party license files

This directory contains license, notice, README, and model-card files copied from the exact third-party packages and model directories bundled with this Logos build.

Some resources, including Node.js, WordNet, CC-CEDICT, Tatoeba-derived data, or native runtime components, may require additional notices that are not stored inside the local package directories.

Before a public binary release, compare this directory with `THIRD_PARTY_NOTICES.md` and make sure every listed bundled dependency has its required exact upstream notice.
EOF

echo
echo "License collection complete."
echo "Review: $OUT"

# WordNet
if [[ -d "$ROOT/dictionaries/wordnet/WordNet-3.0" ]]; then
  mkdir -p "$OUT/wordnet"

  for f in LICENSE COPYING README; do
    if [[ -f "$ROOT/dictionaries/wordnet/WordNet-3.0/$f" ]]; then
      cp -f \
        "$ROOT/dictionaries/wordnet/WordNet-3.0/$f" \
        "$OUT/wordnet/"
    fi
  done

  echo "Collected WordNet notices."
fi
