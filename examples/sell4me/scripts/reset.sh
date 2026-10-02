#!/usr/bin/env bash
# Throw the local stack's state away, start it fresh and provision Sell4me into it.
set -euo pipefail
HERE="$(cd "$(dirname "$0")/.." && pwd)"
REPO="$(cd "$HERE/../.." && pwd)"
STATE="${1:-/tmp/sell4me-stack}"
"$HERE/scripts/stack.sh" stop || true
sleep 1
rm -rf "$STATE"
"$HERE/scripts/stack.sh" start "$STATE"
(cd "$REPO" && PYTHONPATH="$REPO:$HERE/kit" "${PAWABASE_VENV:-$REPO/.venv}/bin/python" "$HERE/scripts/provision.py" "$STATE")
