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

# shellcheck disable=SC1090
source "$EMSDK/emsdk_env.sh" >/dev/null
"$SOURCE_DIR/build_wasm.sh"

cp "$SOURCE_DIR/docs/js/solver-wasm.js" "$REPO_ROOT/docs/js/solver-wasm.js"
cp "$SOURCE_DIR/docs/js/voltorb_wasm.wasm" "$REPO_ROOT/docs/js/voltorb_wasm.wasm"

echo "Built deduplicated WASM assets from $UPSTREAM_COMMIT"
