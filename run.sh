#!/usr/bin/env bash
# Launch the calculator with gpui-shell. Extra arguments (e.g. --watch, --dev)
# are passed through to gpui-shell.
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if ! command -v gpui-shell >/dev/null 2>&1; then
  echo "error: gpui-shell not found in PATH" >&2
  exit 1
fi

exec gpui-shell run -d "$APP_DIR" "$@"
