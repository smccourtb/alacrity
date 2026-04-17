#!/usr/bin/env bash
#
# build-hunters.sh — compile the shiny hunt core C binaries and make them
# portable by bundling libmgba alongside them.
#
# The hunt binaries link libmgba directly (headless emulation core, no Qt).
# Without RPATH/bundling, the compiled binary would hardcode the build
# machine's libmgba path, breaking on every other machine. We fix that by
# compiling with an rpath that points to the binary's own directory ($ORIGIN
# on Linux, @loader_path on macOS) and copying libmgba next to them.
#
# Usage:
#   MGBA_SRC=~/mgba MGBA_BUILD=~/mgba/build ./scripts/build-hunters.sh
#
# Env vars:
#   MGBA_SRC    — path to the mGBA source tree (default: ~/mgba)
#   MGBA_BUILD  — path to the mGBA build dir containing libmgba (default: $MGBA_SRC/build)

set -euo pipefail

MGBA_SRC="${MGBA_SRC:-$HOME/mgba}"
MGBA_BUILD="${MGBA_BUILD:-$MGBA_SRC/build}"

REPO_ROOT="$(git rev-parse --show-toplevel)"
SCRIPTS_DIR="${REPO_ROOT}/scripts"

if [[ ! -d "$MGBA_SRC/include" ]]; then
  echo "Error: MGBA_SRC=$MGBA_SRC doesn't contain include/ — is it a real mGBA source tree?" >&2
  exit 1
fi

UNAME_S="$(uname -s)"

case "$UNAME_S" in
  Linux)
    # Find the canonical libmgba.so file (not the symlinks).
    LIB_REAL="$(find "$MGBA_BUILD" -maxdepth 1 -name 'libmgba.so.*.*.*' -type f | head -n 1)"
    if [[ -z "$LIB_REAL" ]]; then
      echo "Error: couldn't find libmgba.so.X.Y.Z in $MGBA_BUILD" >&2
      exit 1
    fi
    LIB_BUNDLED_NAME="$(readelf -d "$LIB_REAL" 2>/dev/null | awk '/SONAME/ { gsub(/[][]/,"",$5); print $5 }')"
    if [[ -z "$LIB_BUNDLED_NAME" ]]; then
      echo "Error: couldn't read SONAME from $LIB_REAL" >&2
      exit 1
    fi
    RPATH_FLAG='-Wl,-rpath,$ORIGIN'
    ;;
  Darwin)
    LIB_REAL="$(find "$MGBA_BUILD" -maxdepth 1 -name 'libmgba.*.dylib' -type f | head -n 1)"
    if [[ -z "$LIB_REAL" ]]; then
      echo "Error: couldn't find libmgba.*.dylib in $MGBA_BUILD" >&2
      find "$MGBA_BUILD" -name 'libmgba*' >&2 || true
      exit 1
    fi
    # Match the filename the Tauri bundle expects (tauri.conf.json resources).
    LIB_BUNDLED_NAME="libmgba.0.11.dylib"
    RPATH_FLAG='-Wl,-rpath,@loader_path'
    ;;
  *)
    echo "Error: unsupported platform $UNAME_S" >&2
    exit 1
    ;;
esac

echo "==> Platform:     $UNAME_S"
echo "==> mGBA source:  $MGBA_SRC"
echo "==> mGBA build:   $MGBA_BUILD"
echo "==> libmgba file: $(basename "$LIB_REAL")"
echo "==> bundled as:   $LIB_BUNDLED_NAME"

for src_name in shiny_hunter_core shiny_hunter_wild shiny_hunter_egg shiny_hunter_crystal_stationary; do
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
    $RPATH_FLAG \
    -lmgba
done

echo "==> Copying $LIB_BUNDLED_NAME to $SCRIPTS_DIR"
cp "$LIB_REAL" "$SCRIPTS_DIR/$LIB_BUNDLED_NAME"
chmod +x "$SCRIPTS_DIR/$LIB_BUNDLED_NAME"

# On macOS, rewrite each binary's install-name reference for libmgba so it
# resolves to @rpath/<bundled name>. The linker records whatever install-name
# the dylib had at build time (often an absolute path), which will not match
# the bundled copy next to the binary.
if [[ "$UNAME_S" == "Darwin" ]]; then
  for bin in shiny_hunter_core shiny_hunter_wild shiny_hunter_egg shiny_hunter_crystal_stationary; do
    bin_path="${SCRIPTS_DIR}/${bin}"
    [[ -x "$bin_path" ]] || continue
    OLD_INSTALL="$(otool -L "$bin_path" | awk '/libmgba/ { print $1; exit }')"
    if [[ -n "$OLD_INSTALL" && "$OLD_INSTALL" != "@rpath/$LIB_BUNDLED_NAME" ]]; then
      install_name_tool -change "$OLD_INSTALL" "@rpath/$LIB_BUNDLED_NAME" "$bin_path"
    fi
  done
fi

echo ""
echo "==> Done. Verification:"
for bin in shiny_hunter_core shiny_hunter_wild shiny_hunter_egg shiny_hunter_crystal_stationary; do
  bin_path="${SCRIPTS_DIR}/${bin}"
  [[ -x "$bin_path" ]] || continue
  printf "  %s: " "$bin"
  case "$UNAME_S" in
    Linux)
      runpath="$(readelf -d "$bin_path" 2>/dev/null | awk '/RUNPATH|RPATH/ { gsub(/[][]/,"",$5); print $5 }')"
      printf "rpath=%s\n" "${runpath:-none}"
      ;;
    Darwin)
      printf "libmgba ref=%s\n" "$(otool -L "$bin_path" | awk '/libmgba/ { print $1; exit }')"
      ;;
  esac
done
echo ""
echo "==> Generating hunt-manifest.json from @alacrity markers in .c sources"
manifest="${SCRIPTS_DIR}/hunt-manifest.json"
{
  printf '{\n  "binaries": {\n'
  first=1
  for bin in shiny_hunter_core shiny_hunter_wild shiny_hunter_egg shiny_hunter_crystal_stationary; do
    src="${SCRIPTS_DIR}/${bin}.c"
    [[ -f "$src" ]] || continue
    line="$(grep -m1 -oE '@alacrity[^*]+' "$src" || true)"
    [[ -z "$line" ]] && continue
    games="$(echo "$line" | grep -oE 'games=[^ ]+' | cut -d= -f2 | tr -d '\r' || true)"
    modes="$(echo "$line" | grep -oE 'modes=[^ ]+' | cut -d= -f2 | tr -d '\r' || true)"
    [[ $first -eq 1 ]] || printf ',\n'
    first=0
    games_json="$(echo "$games" | tr ',' '\n' | awk 'BEGIN{printf "["} {printf "%s\"%s\"", (NR>1?",":""), $0} END{printf "]"}')"
    modes_json="$(echo "$modes" | tr ',' '\n' | awk 'BEGIN{printf "["} {printf "%s\"%s\"", (NR>1?",":""), $0} END{printf "]"}')"
    printf '    "%s": { "games": %s, "modes": %s }' "$bin" "$games_json" "$modes_json"
  done
  printf '\n  }\n}\n'
} > "$manifest"
echo "==> Wrote $manifest"

echo ""
echo "==> Commit: git add scripts/shiny_hunter_* scripts/libmgba.* scripts/hunt-manifest.json"
