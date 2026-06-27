#!/usr/bin/env bash
#
# serve-coverage.sh — Start dev server in COVERAGE=1 mode with port checking.
#
# Usage:
#   bash serve-coverage.sh              # uses default PORT=3000
#   PORT=8080 bash serve-coverage.sh    # use a different port
#

set -euo pipefail

PORT="${PORT:-3000}"

# ── Check port availability ─────────────────────────────────────────
if command -v ss >/dev/null 2>&1; then
    if ss -tlnp 2>/dev/null | grep -q ":${PORT} "; then
        echo ""
        echo "  ✗  Port ${PORT} is already in use."
        echo ""
        echo "  To fix this, do one of the following:"
        echo ""
        echo "    1. Kill the existing server:"
        echo "         lsof -ti :${PORT} | xargs kill"
        echo ""
        echo "    2. Use a different port:"
        echo "         PORT=8080 npm run serve:coverage"
        echo ""
        echo "    3. Use the all-in-one script (handles this automatically):"
        echo "         npm run test:all"
        echo ""
        exit 1
    fi
elif command -v lsof >/dev/null 2>&1; then
    if lsof -i ":${PORT}" >/dev/null 2>&1; then
        echo ""
        echo "  ✗  Port ${PORT} is already in use."
        echo ""
        echo "  To fix this, do one of the following:"
        echo ""
        echo "    1. Kill the existing server:"
        echo "         lsof -ti :${PORT} | xargs kill"
        echo ""
        echo "    2. Use a different port:"
        echo "         PORT=8080 npm run serve:coverage"
        echo ""
        echo "    3. Use the all-in-one script (handles this automatically):"
        echo "         npm run test:all"
        echo ""
        exit 1
    fi
fi

# ── Start server ────────────────────────────────────────────────────
exec COVERAGE=1 node server.js
