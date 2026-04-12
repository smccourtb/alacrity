#!/bin/bash
set -euo pipefail

TARGETS=("bun-linux-x64" "bun-darwin-arm64" "bun-windows-x64")
TAURI_TRIPLES=("x86_64-unknown-linux-gnu" "aarch64-apple-darwin" "x86_64-pc-windows-msvc")
OUT_DIR="src-tauri/binaries"

mkdir -p "$OUT_DIR"

for i in "${!TARGETS[@]}"; do
  target="${TARGETS[$i]}"
  triple="${TAURI_TRIPLES[$i]}"
  ext=""
  [[ "$target" == *windows* ]] && ext=".exe"

  echo "Building sidecar for $target..."
  bun build --compile --target="$target" server/src/index.ts \
    --outfile "$OUT_DIR/alacrity-server-${triple}${ext}"
done

echo "Sidecar binaries:"
ls -lh "$OUT_DIR"/alacrity-server-*
