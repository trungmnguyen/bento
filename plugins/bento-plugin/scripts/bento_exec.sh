#!/usr/bin/env bash
# Bento CLI Universal Launcher Wrapper
set -euo pipefail

# Check if bento command is available in PATH
if command -v bento >/dev/null 2>&1; then
    exec bento "$@"
fi

# Check Homebrew default location
if [ -x "/opt/homebrew/bin/bento" ]; then
    exec /opt/homebrew/bin/bento "$@"
fi

# Fallback: execute via Python module with PYTHONPATH
BENTO_ROOT="${BENTO_DIR:-/Users/tmnguyen/Dev/bento}"
if [ -d "$BENTO_ROOT/src" ]; then
    export PYTHONPATH="$BENTO_ROOT/src:${PYTHONPATH:-}"
    exec python3.12 -m bento.frameworks.cli "$@"
fi

echo "Error: Bento could not be located. Please install bento or set BENTO_DIR." >&2
exit 1
