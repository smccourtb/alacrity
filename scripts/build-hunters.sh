#!/usr/bin/env bash
#
# build-hunters.sh — compile the shiny hunt core C binaries and make them
# portable by bundling libmgba alongside them.
#
# The hunt binaries link libmgba directly (headless emulation core, no Qt).
# Without RPATH/bundling, the compiled binary would hardcode the build
# machine's libmgba path, breaking on every other machine. We fix that by
# compiling with -Wl,-rpath,$ORIGIN so the binary looks for libmgba.so
# next to itself at runtime, and copying libmgba.so into scripts/.
#
# Usage:
#   MGBA_SRC=~/mgba MGBA_BUILD=~/mgba/build ./scripts/build-hunters.sh
#
# Env vars:
#   MGBA_SRC    — path to the mGBA source tree (default: ~/mgba)
#   MGBA_BUILD  — path to the mGBA build dir containing libmgba.so (default: $MGBA_SRC/build)

set -euo pipefail

MGBA_SRC="${MGBA_SRC:-$HOME/mgba}"
MGBA_BUILD="${MGBA_BUILD:-$MGBA_SRC/build}"

REPO_ROOT="$(git rev-parse --show-toplevel)"
SCRIPTS_DIR="${REPO_ROOT}/scripts"

if [[ ! -d "$MGBA_SRC/include" ]]; then
  echo "Error: MGBA_SRC=$MGBA_SRC doesn't contain include/ — is it a real mGBA source tree?" >&2
  exit 1
fi

# Find the canonical libmgba.so file (not the symlinks).
LIBMGBA_REAL="$(find "$MGBA_BUILD" -maxdepth 1 -name 'libmgba.so.*.*.*' -type f | head -n 1)"
if [[ -z "$LIBMGBA_REAL" ]]; then
  echo "Error: couldn't find libmgba.so.X.Y.Z in $MGBA_BUILD" >&2
  exit 1
fi
LIBMGBA_SONAME="$(readelf -d "$LIBMGBA_REAL" 2>/dev/null | awk '/SONAME/ { gsub(/[][]/,"",$5); print $5 }')"
if [[ -z "$LIBMGBA_SONAME" ]]; then
  echo "Error: couldn't read SONAME from $LIBMGBA_REAL" >&2
  exit 1
fi

echo "==> mGBA source:  $MGBA_SRC"
echo "==> mGBA build:   $MGBA_BUILD"
echo "==> libmgba file: $(basename "$LIBMGBA_REAL")"
echo "==> libmgba name: $LIBMGBA_SONAME"

# Compile the three hunters with RPATH $ORIGIN so they find libmgba at runtime
# in the same directory as the binary itself.
for src_name in shiny_hunter_core shiny_hunter_wild shiny_hunter_egg; do
  src_file="${SCRIPTS_DIR}/${src_name}.c"
  out_file="${SCRIPTS_DIR}/${src_name}"
  if [[ ! -f "$src_file" ]]; then
    echo "Warning: $src_file not found, skipping" >&2
    continue
  fi
  echo "==> Compiling $src_name"
  cc -O2 -o "$out_file" "$src_file" \
    -I"$MGBA_SRC/include" \
    -L"$MGBA_BUILD" \
    -Wl,-rpath,'$ORIGIN' \
    -lmgba
done

# Copy libmgba next to the binaries. Use the SONAME as the filename so the
# binary's NEEDED entry resolves without following symlinks.
echo "==> Copying $LIBMGBA_SONAME to $SCRIPTS_DIR"
cp "$LIBMGBA_REAL" "$SCRIPTS_DIR/$LIBMGBA_SONAME"
chmod +x "$SCRIPTS_DIR/$LIBMGBA_SONAME"

echo ""
echo "==> Done. Verification:"
for bin in shiny_hunter_core shiny_hunter_wild shiny_hunter_egg; do
  bin_path="${SCRIPTS_DIR}/${bin}"
  if [[ -x "$bin_path" ]]; then
    printf "  %s: " "$bin"
    runpath="$(readelf -d "$bin_path" 2>/dev/null | awk '/RUNPATH|RPATH/ { gsub(/[][]/,"",$5); print $5 }')"
    printf "rpath=%s\n" "${runpath:-none}"
  fi
done
echo ""
echo "==> Commit: git add scripts/shiny_hunter_* scripts/libmgba.so.*"
