#!/usr/bin/env bash
#
# run-tests.sh — All-in-one Cypress test runner with coverage + HTML reports.
#
# Usage:
#   bash run-tests.sh                          # run all specs
#   bash run-tests.sh cypress/e2e/theme.spec.js  # run single spec
#   SPEC="cypress/e2e/theme.spec.js" bash run-tests.sh
#
# What it does:
#   1. Cleans previous test/coverage artifacts
#   2. Instruments js/*.js with Istanbul (nyc)
#   3. Starts server in COVERAGE=1 mode (serves instrumented files)
#   4. Runs Cypress E2E tests (headless Electron)
#   5. Merges Mochawesome JSON reports → single HTML report
#   6. Generates Istanbul coverage HTML report
#   7. Prints a summary and opens both reports in your browser
#

set -euo pipefail

# ────────────────────────────────────────────────────────────────────
#  Helpers
# ────────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; CYAN='\033[0;36m'; YELLOW='\033[1;33m'; NC='\033[0m'
info()  { printf "${CYAN}[  ]${NC} %b\n" "$*"; }
ok()    { printf "${GREEN}[✓ ]${NC} %b\n" "$*"; }
warn()  { printf "${YELLOW}[! ]${NC} %b\n" "$*"; }
fail()  { printf "${RED}[✗ ]${NC} %b\n" "$*"; }

# ────────────────────────────────────────────────────────────────────
#  Pre-flight checks
# ────────────────────────────────────────────────────────────────────
info "Pre-flight checks..."
command -v node >/dev/null  || { fail "node not found"; }
command -v npx  >/dev/null  || { fail "npx not found"; }
command -v curl >/dev/null  || { fail "curl not found"; }
ok "Dependencies OK (node, npx, curl)."

# ────────────────────────────────────────────────────────────────────
#  1. Clean previous artifacts
# ────────────────────────────────────────────────────────────────────
info "Step 1/6 — Cleaning previous artifacts..."
rm -rf cypress/coverage .nyc_output js-instrumented
rm -f cypress/results/*.json
mkdir -p cypress/results
ok "Cleaned."

# ────────────────────────────────────────────────────────────────────
#  2. Instrument application JS
# ────────────────────────────────────────────────────────────────────
info "Step 2/6 — Instrumenting js/ with babel-plugin-istanbul…"
npx @babel/cli js --out-dir js-instrumented --source-maps inline
INSTRUMENTED=$(find js-instrumented -name '*.js' -type f | wc -l)
ok "Instrumented ${INSTRUMENTED} files → js-instrumented/"

# ────────────────────────────────────────────────────────────────────
#  3. Start dev server in COVERAGE mode
# ────────────────────────────────────────────────────────────────────
PORT="${PORT:-3000}"
BASE_URL="http://localhost:${PORT}"

info "Step 3/6 — Starting dev server at ${BASE_URL} (COVERAGE=1)..."

# Check port availability
if command -v ss >/dev/null 2>&1; then
    if ss -tlnp | grep -q ":${PORT} "; then
        fail "Port ${PORT} already in use. Kill the existing server or set PORT=XXXX."
    fi
elif command -v lsof >/dev/null 2>&1; then
    if lsof -i ":${PORT}" >/dev/null 2>&1; then
        fail "Port ${PORT} already in use."
    fi
fi

SERVER_PID=""
cleanup() {
    if [ -n "$SERVER_PID" ] && kill -0 "$SERVER_PID" 2>/dev/null; then
        info "Stopping dev server (PID ${SERVER_PID})..."
        kill "$SERVER_PID" 2>/dev/null || true
        wait  "$SERVER_PID" 2>/dev/null || true
        ok "Server stopped."
    fi
}
trap cleanup EXIT INT TERM

COVERAGE=1 node server.js &
SERVER_PID=$!
ok "Server started (PID ${SERVER_PID})."

# ────────────────────────────────────────────────────────────────────
#  4. Wait for the server to respond
# ────────────────────────────────────────────────────────────────────
info "Step 4/6 — Waiting for server to become ready..."
for i in $(seq 1 30); do
    if curl -sf "${BASE_URL}" >/dev/null 2>&1; then
        ok "Server is ready (${i}s)."
        break
    fi
    sleep 1
done

if ! curl -sf "${BASE_URL}" >/dev/null 2>&1; then
    fail "Server did not start within 30 s. Check output above."
fi

# ────────────────────────────────────────────────────────────────────
#  5. Run Cypress tests
# ────────────────────────────────────────────────────────────────────
BROWSER="${BROWSER:-electron}"
SPEC_ARG=""

# Accept spec from CLI argument or SPEC env var
if [ $# -gt 0 ]; then SPEC_ARG="--spec $1"; elif [ -n "${SPEC:-}" ]; then SPEC_ARG="--spec ${SPEC}"; fi

info "Step 5/6 — Running Cypress tests (${BROWSER})..."
[ -n "$SPEC_ARG" ] && info "Spec filter: ${SPEC_ARG}"

set +e  # capture exit code manually so we still generate reports
npx cypress run --browser "${BROWSER}" ${SPEC_ARG:-}
CYPRESS_RC=$?
set -e

if [ ${CYPRESS_RC} -eq 0 ]; then
    ok "All tests passed."
else
    warn "Some tests failed (exit code ${CYPRESS_RC})."
fi

# ────────────────────────────────────────────────────────────────────
#  6. Generate reports
# ────────────────────────────────────────────────────────────────────
info "Step 6/6 — Generating reports..."

# 6a. Merge Mochawesome JSON → single HTML report
JSON_COUNT=$(find cypress/results -maxdepth 1 -name '*.json' -type f | wc -l)
if [ "${JSON_COUNT}" -gt 0 ]; then
    npx cypress-mochawesome-reporter merge cypress/results/*.json -o cypress/results 2>/dev/null || true
    if [ -f cypress/results/mochawesome.html ]; then
        ok "Mochawesome report → cypress/results/mochawesome.html"
    else
        warn "Mochawesome merge produced no HTML file."
    fi
else
    warn "No Mochawesome JSON files found (tests may have crashed before reporting)."
fi

# 6b. Istanbul coverage report + self-contained HTML
if [ -d .nyc_output ] && [ "$(ls -A .nyc_output 2>/dev/null)" ]; then
    npx nyc report --reporter=text-summary 2>/dev/null || true

    # Generate self-contained HTML report (viewable via file://)
    node scripts/generate-coverage-report.js || true
    if [ -f cypress/coverage/index.html ]; then
        ok "Coverage report   → cypress/coverage/index.html"
    else
        warn "Coverage report generation failed."
    fi
else
    warn "No coverage data collected (.nyc_output is empty or missing)."
    warn "This is expected when tests don't exercise instrumented code paths."
fi

# ────────────────────────────────────────────────────────────────────
#  Summary + open reports
# ────────────────────────────────────────────────────────────────────
echo ""
echo " ════════════════════════════════════════════════════════"
echo "  Test Run Summary"
echo " ════════════════════════════════════════════════════════"
[ -f cypress/results/mochawesome.html ] && echo "  Test Report :  cypress/results/mochawesome.html"
[ -f cypress/coverage/index.html      ] && echo "  Coverage    :  cypress/coverage/index.html"
echo " ════════════════════════════════════════════════════════"
echo ""

# Open in browser if a GUI opener is available
case "$(uname -s)" in
    Linux*)   OPENER="xdg-open"  ;;
    Darwin*)  OPENER="open"      ;;
    CYGWIN*|MINGW*) OPENER="start" ;;
    *)        OPENER=""          ;;
esac

if command -v "${OPENER}" >/dev/null 2>&1; then
    info "Opening reports in your browser..."
    [ -f cypress/results/mochawesome.html ] && "${OPENER}" cypress/results/mochawesome.html &
    [ -f cypress/coverage/index.html      ] && sleep 0.3 && "${OPENER}" "file://$(pwd)/cypress/coverage/index.html" &
else
    info "Reports ready — open them manually:"
    [ -f cypress/results/mochawesome.html ] && echo "  ${OPENER} cypress/results/mochawesome.html"
    [ -f cypress/coverage/index.html      ] && echo "  ${OPENER} cypress/coverage/index.html"
fi

exit ${CYPRESS_RC}
