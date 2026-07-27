#!/usr/bin/env bash
set -euo pipefail

UPSTREAM_COMMIT="3f1173cdac8ab24bcb6933f26dee8428d8b89712"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

if [[ -z "${EMSDK:-}" || ! -f "$EMSDK/emsdk_env.sh" ]]; then
  echo "Set EMSDK to an activated Emscripten SDK directory." >&2
  exit 1
fi

SOURCE_DIR="$(mktemp -d "${TMPDIR:-/tmp}/voltwise-wasm.XXXXXX")"
trap 'rm -rf -- "$SOURCE_DIR"' EXIT

git clone --quiet https://github.com/GimmyTomas/voltorb-flip.git "$SOURCE_DIR"
git -C "$SOURCE_DIR" checkout --quiet "$UPSTREAM_COMMIT"
git -C "$SOURCE_DIR" apply "$REPO_ROOT/wasm/deduplicate-compatible-boards.patch"
git -C "$SOURCE_DIR" apply "$REPO_ROOT/wasm/certified-cmake.patch"
cp "$REPO_ROOT/wasm/certified_solver.hpp" "$SOURCE_DIR/include/voltorb/certified_solver.hpp"
cp "$REPO_ROOT/wasm/certified_solver.cpp" "$SOURCE_DIR/src/certified_solver.cpp"
cp "$REPO_ROOT/wasm/certified_solver_bindings.cpp" "$SOURCE_DIR/docs/wasm/solver_bindings.cpp"

# shellcheck disable=SC1090
source "$EMSDK/emsdk_env.sh" >/dev/null

# Git Bash does not automatically inherit Visual Studio's bundled CMake and
# Ninja paths.
if ! command -v cmake >/dev/null 2>&1 &&
   [[ -x "/c/Program Files (x86)/Microsoft Visual Studio/2022/BuildTools/Common7/IDE/CommonExtensions/Microsoft/CMake/CMake/bin/cmake.exe" ]]; then
  export PATH="/c/Program Files (x86)/Microsoft Visual Studio/2022/BuildTools/Common7/IDE/CommonExtensions/Microsoft/CMake/CMake/bin:/c/Program Files (x86)/Microsoft Visual Studio/2022/BuildTools/Common7/IDE/CommonExtensions/Microsoft/CMake/Ninja:$PATH"
fi

# Recent Windows SDKs ship Python entry points plus .bat/.ps1 wrappers, but no
# extensionless shims for Git Bash. Export small shell functions so the pinned
# build remains portable.
if ! command -v emcmake >/dev/null 2>&1; then
  emcmake() {
    "$EMSDK_PYTHON" "$EMSDK/upstream/emscripten/emcmake.py" "$@"
  }
  export -f emcmake
fi

BUILD_DIR="$SOURCE_DIR/build_wasm"
emcmake cmake -S "$SOURCE_DIR" -B "$BUILD_DIR" -G Ninja \
  -DCMAKE_BUILD_TYPE=Release \
  -DVOLTORB_ENABLE_THREADS=OFF \
  -DVOLTORB_BUILD_WASM=ON \
  -DVOLTORB_BUILD_TESTS=OFF
cmake --build "$BUILD_DIR" --target voltorb_wasm --parallel

cp "$BUILD_DIR/voltorb_wasm.js" "$SOURCE_DIR/docs/js/solver-wasm.js"
cp "$BUILD_DIR/voltorb_wasm.wasm" "$SOURCE_DIR/docs/js/voltorb_wasm.wasm"

cp "$SOURCE_DIR/docs/js/solver-wasm.js" "$REPO_ROOT/docs/js/solver-wasm.js"
cp "$SOURCE_DIR/docs/js/voltorb_wasm.wasm" "$REPO_ROOT/docs/js/voltorb_wasm.wasm"

echo "Built exact-mass certified WASM assets from $UPSTREAM_COMMIT"
