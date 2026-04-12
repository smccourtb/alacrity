#!/usr/bin/env bash
#
# build-bsdtar.sh — source bsdtar (libarchive) binaries for all three target platforms.
#
# Usage:
#   ./scripts/build-bsdtar.sh linux-x64     # build from source on current Linux host
#   ./scripts/build-bsdtar.sh macos-arm64   # build from source on current macOS arm64 host
#   ./scripts/build-bsdtar.sh windows-x64   # fetch pre-built from libarchive Windows release
#   ./scripts/build-bsdtar.sh all           # all of the above (requires running on each OS)
#
# Output: writes bsdtar-<triple> (or .exe) to src-tauri/resources/bin/
#
# After running, SHA256 of each binary is printed and should be committed alongside
# the binary so CI can verify it wasn't tampered with.

set -euo pipefail

LIBARCHIVE_VERSION="3.7.7"
LIBARCHIVE_TARBALL_URL="https://github.com/libarchive/libarchive/releases/download/v${LIBARCHIVE_VERSION}/libarchive-${LIBARCHIVE_VERSION}.tar.gz"

REPO_ROOT="$(git rev-parse --show-toplevel)"
BIN_DIR="${REPO_ROOT}/src-tauri/resources/bin"
mkdir -p "${BIN_DIR}"

build_from_source() {
  local triple="$1"
  local out="$2"
  local tmpdir
  tmpdir="$(mktemp -d)"
  pushd "${tmpdir}" > /dev/null

  echo "==> Downloading libarchive ${LIBARCHIVE_VERSION} source"
  curl -L -o libarchive.tar.gz "${LIBARCHIVE_TARBALL_URL}"
  tar -xzf libarchive.tar.gz
  cd "libarchive-${LIBARCHIVE_VERSION}"

  echo "==> Configuring libarchive (bsdtar only, static, with zlib+lzma+zstd+bz2 compression)"
  ./configure \
    --disable-shared \
    --enable-static \
    --disable-bsdcat \
    --disable-bsdcpio \
    --disable-bsdunzip \
    --without-libb2 \
    --without-iconv \
    --without-cng \
    --without-openssl \
    --without-xml2 \
    --without-expat

  echo "==> Building bsdtar"
  make -j"$(nproc 2>/dev/null || sysctl -n hw.ncpu)" bsdtar

  echo "==> Copying binary to ${out}"
  cp bsdtar "${out}"
  strip "${out}" 2>/dev/null || true
  chmod +x "${out}"

  popd > /dev/null
  rm -rf "${tmpdir}"

  local sha
  sha="$(sha256sum "${out}" 2>/dev/null || shasum -a 256 "${out}")"
  echo "==> SHA256: ${sha}"
}

target="${1:-}"

case "${target}" in
  linux-x64)
    if [[ "$(uname -s)" != "Linux" ]]; then
      echo "Error: linux-x64 target must be built on a Linux host" >&2
      exit 1
    fi
    build_from_source linux-x64 "${BIN_DIR}/bsdtar-linux-x64"
    ;;
  macos-arm64)
    if [[ "$(uname -s)" != "Darwin" ]]; then
      echo "Error: macos-arm64 target must be built on a macOS host" >&2
      exit 1
    fi
    build_from_source macos-arm64 "${BIN_DIR}/bsdtar-macos-arm64"
    ;;
  windows-x64)
    echo "Error: windows-x64 is not yet automated. Build libarchive from source on a" >&2
    echo "Windows host using MSYS2 + mingw-w64 and copy the resulting bsdtar.exe to" >&2
    echo "  ${BIN_DIR}/bsdtar-windows-x64.exe" >&2
    echo "A detailed build guide will be added as a follow-up." >&2
    exit 2
    ;;
  all)
    echo "The 'all' target requires building on each host OS. Run this script once per" >&2
    echo "host with the per-OS target." >&2
    exit 1
    ;;
  *)
    echo "Usage: $0 {linux-x64|macos-arm64|windows-x64|all}" >&2
    exit 1
    ;;
esac

echo "==> Done. Commit the binary with: git add ${BIN_DIR}"
