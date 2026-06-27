# Cypress E2E Tests — User Guide

How to set up and run the end-to-end test suite for RAG-Browser on **Fedora 43** (and other Linux distros).

---

## Quick Start

The fastest way to run everything (tests + coverage + HTML reports) in a single command:

```bash
npm run test:all
```

This all-in-one script:
1. Cleans previous artifacts
2. Instruments `js/*.js` with Istanbul (nyc)
3. Starts the dev server in COVERAGE=1 mode
4. Runs all Cypress tests headlessly
5. Generates a merged Mochawesome HTML report → `cypress/results/mochawesome.html`
6. Generates an Istanbul coverage HTML report → `cypress/coverage/index.html`
7. Opens both reports in your browser
8. Automatically stops the server when done

You can also target a **single spec**:

```bash
npm run test:all cypress/e2e/theme.spec.js
```

Or via environment variable:

```bash
SPEC="cypress/e2e/theme.spec.js" npm run test:all
```

---

## Prerequisites

### 1. Node.js & npm

| Tool | Minimum Version |
|------|----------------|
| Node.js | `20.x`, `22.x`, or `>=24.x` |
| npm | `>=10.1.0` |

Check your version:

```bash
node --version
npm --version
```

If not installed or too old:

```bash
sudo dnf install nodejs npm
```

### 2. System Dependencies (Linux)

Cypress bundles Electron, which requires X11 libraries to run even in headless mode. Install them with:

```bash
# Fedora / RHEL / Amazon Linux (dnf)
sudo dnf install -y \
  xorg-x11-server-Xvfb \
  gtk3 \
  nss \
  alsa-lib \
  libXScrnSaver \
  at-spi2-atk \
  libdrm \
  mesa-libgbm \
  libxkbcommon \
  xorg-x11-fonts-Type1 \
  xorg-x11-fonts-misc
```

<details>
<summary><strong>Ubuntu / Debian (apt)</strong></summary>

```bash
sudo apt-get install -y \
  libgtk-3-0t64 \
  libgbm-dev \
  libnotify-dev \
  libnss3 \
  libxss1 \
  libasound2t64 \
  libxtst6 \
  xauth \
  xvfb
```

</details>

<details>
<summary><strong>Arch Linux (pacman)</strong></summary>

```bash
sudo pacman -S gtk3 alsa-lib xorg-server-xvfb libxss nss libnotify
```

</details>

### 3. Install Cypress

From the project root, run:

```bash
npm install
```

This downloads the Cypress binary (~150 MB) into your local cache on first install.

#### npm 12+ Note

Starting with npm 12, dependency install scripts (`postinstall`) are blocked by default. If Cypress doesn't download its binary during `npm install`, run one of:

```bash
# Option A: Approve Cypress for postinstall scripts
npm approve-scripts cypress

# Option B: Install the binary explicitly
npx cypress install
```

You can verify the installation succeeded with:

```bash
npx cypress verify
```

---

## Running Tests

### Before You Start

The RAG-Browser dev server must be running on `http://localhost:3000`. Start it in one terminal:

```bash
node server.js
# or
npm start
```

You should see:

```
RAG-Browser dev server running at http://localhost:3000
COOP/COEP headers enabled — SharedArrayBuffer available for multi-threaded WASM
```

### All-in-One Script (Recommended)

The `run-tests.sh` script handles everything automatically — no manual server management required:

```bash
# Run all specs with coverage + reports
npm run test:all

# Run a single spec
npm run test:all cypress/e2e/theme.spec.js

# Use a different port (if 3000 is occupied)
PORT=8080 npm run test:all

# Use a different browser
BROWSER=firefox npm run test:all
```

The script includes:
- **Port checking** — fails with a helpful message if the port is already in use
- **Auto-cleanup** — stops the server on exit or interrupt (Ctrl+C)
- **Color-coded output** — clear `[✓]`/`[✗]`/`[!]` status indicators
- **Auto-open** — opens both HTML reports in your browser on Linux

### Headless Mode (CI-style)

In a second terminal (with the server running), run all tests without opening a browser window:

```bash
npm run test:e2e
```

This runs all specs against the bundled Electron browser, prints results to the terminal, and **generates Mochawesome test reports** in `cypress/results/`.

### Test Reports (Mochawesome)

Every test run automatically generates individual JSON reports per spec. To merge them into a single beautiful HTML report:

```bash
npm run test:e2e:report
```

This:
1. Runs all specs headlessly
2. Merges individual JSON reports into one combined HTML report
3. Saves the report to `cypress/results/`

Open `cypress/results/mochawesome.html` in your browser to view:
- Summary dashboard with pass/fail charts
- Per-spec breakdowns
- Embedded screenshots on failures
- All test attempt history

### Code Coverage

#### Option A: All-in-one (easiest)

```bash
npm run test:all
```

This handles everything automatically: instrumentation, server lifecycle, tests, and report generation. Coverage report → `cypress/coverage/index.html`.

#### Option B: Manual two-terminal workflow

**Terminal 1** — Start the server in coverage mode (serves instrumented JS files):
```bash
npm run serve:coverage
```

This includes a **port check** — if port 3000 is already in use, you'll get a helpful error with instructions. Use `PORT=8080 npm run serve:coverage` to use a different port.

**Terminal 2** — Run tests and generate coverage report:
```bash
npm run test:coverage
```

This:
1. Cleans previous coverage artifacts
2. Instruments `js/*.js` files into `js-instrumented/` (with Istanbul)
3. Runs all Cypress tests against the instrumented code
4. Generates an HTML coverage report in `cypress/coverage/`

Open `cypress/coverage/index.html` in your browser to view:
- Line, branch, and function coverage per file
- Uncovered lines highlighted in red
- Overall coverage summary

**Note:** Coverage mode serves instrumented files from `js-instrumented/` via `server.js` with `COVERAGE=1`. The instrumentation adds overhead, so tests run slightly slower.

### Interactive Mode (GUI)

To explore tests visually with screenshots and DOM inspection:

```bash
npm run test:e2e:open
```

The Cypress Test Runner will open. From there:

1. Select **E2E Testing**
2. Choose **Electron** as the browser
3. Click any spec file to run it interactively

### Running a Single Spec

To run only one test file in headless mode (useful when developing):

```bash
npx cypress run --browser electron --spec "cypress/e2e/theme.spec.js"
```

To run only one test file in headed mode (useful when developing):

```bash
npx cypress run --headed --browser electron --spec "cypress/e2e/theme.spec.js"
```

To run only one test file in headed mode, utilizing Firefox (useful when developing):

```bash
npx cypress run --headed --browser firefox --spec "cypress/e2e/theme.spec.js"
```

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm start` | Start the dev server on port 3000 |
| `npm run test:all` | **All-in-one:** clean → instrument → serve → test → reports (auto-opens in browser) |
| `npm run test:all <spec>` | Run a single spec with all-in-one workflow |
| `npm run test:e2e` | Run tests headlessly (generates Mochawesome JSON reports) |
| `npm run test:e2e:open` | Open Cypress Test Runner GUI |
| `npm run test:e2e:report` | Run tests and merge into a single HTML report |
| `npm run serve:coverage` | Start server in coverage mode with port checking (serves instrumented JS) |
| `npm run test:coverage` | Full coverage pipeline: clean → instrument → test → report |
| `npm run coverage:clean` | Remove all coverage artifacts |
| `npm run coverage:instrument` | Pre-instrument JS files (used by test:coverage) |

---

## Test Suite Overview

| Spec | What It Tests | Tests |
|------|--------------|-------|
| `app-loading.spec.js` | Page title, DOM containers, status indicators | 5 |
| `sidebar.spec.js` | Upload area, model buttons (disabled state), DB actions | 5 |
| `chat-interface.spec.js` | Query input, send button, stop button hidden | 5 |
| `theme.spec.js` | Dark/light toggle, persistence across reloads | 4 |
| `language-selector.spec.js` | Dropdown visibility, all 5 languages present | 5 |
| `help-modal.spec.js` | Modal open/close, content verification | 4 |
| `settings.spec.js` | Chunking sizes, LLM sliders, Search mode selector | 17 |
| **Total** | | **45** |

---

## Important Notes

### These Tests Do NOT Require AI Models

All tests validate UI structure and interactions. They do **not**:

- Load embedding or LLM models
- Process documents
- Run inference or RAG queries

This means:
- Tests run in **seconds**, not minutes
- No WebGPU required for testing
- Fully deterministic — same result every time

### Known Limitations

| Area | Detail |
|------|--------|
| **WebGPU** | Not available in Cypress's bundled Electron. Tests skip all AI paths intentionally. |
| **CDN resources** | KaTeX and Mermaid load from jsDelivr. If the network is down, these may fail — but errors are suppressed in `support/e2e.js` so tests still pass. |
| **Search mode** | The dropdown has only `hybrid` and `vector` options. There is no `keyword` mode. |
| **Flatpak sandboxes** | Cypress/Electron cannot run from within a Flatpak terminal (e.g., Zed installed via Flatpak). Use a native terminal instead — see Troubleshooting below. |

---

## Troubleshooting

### "Can't connect to server"

The dev server isn't running. Start it with `node server.js` and verify:

```bash
curl http://localhost:3000 | head -5
```

You should see the HTML of `index.html`.

### "Port 3000 is already in use"

Another process (likely a previous `node server.js`) is occupying port 3000. Kill it with:

```bash
lsof -ti :3000 | xargs kill
```

Then try again. The `serve-coverage.sh` and `run-tests.sh` scripts include port checking and will give you a helpful error message instead of a cryptic crash.

### "Electron not found"

The Cypress binary wasn't downloaded. Fix with:

```bash
npx cypress install
npx cypress verify
```

### "No specs found"

Check that your spec files match the pattern in `cypress.config.js`:

```javascript
specPattern: 'cypress/e2e/**/*.spec.js'
```

Make sure your test files are named `*.spec.js` and live under `cypress/e2e/`.

### Tests pass locally but fail in CI

In CI, ensure port 3000 is free. Use the official GitHub Action which handles server lifecycle:

```yaml
- uses: cypress-io/github-action@v6
  with:
    start: node server.js
    wait-on: 'http://localhost:3000'
    browser: electron
```

### "symbol lookup error" or "Cypress failed to start"

If you see `undefined symbol: g_once_init_leave_pointer` or similar library errors, **you are running inside a Flatpak sandbox** (e.g., Zed installed via Flatpak on Fedora). The Flatpak's bundled GLib conflicts with the system's json-glib.

**Fix:** Run Cypress from a native terminal outside the Flatpak. Open GNOME Terminal, Konsole, or your preferred system terminal:

```bash
cd /home/robert/AI_Projects/RAG-Browser/rag-v2-qwen3.6-27b
npm run test:all              # All-in-one (recommended)
# Or manually:
node server.js                # Terminal 1 — dev server
npm run test:e2e              # Terminal 2 — headless tests
npm run test:e2e:open         # Terminal 2 — interactive GUI
```

### Coverage shows zero or near-zero

- Make sure you're using `npm run test:all` or the two-terminal coverage workflow (`serve:coverage` + `test:coverage`).
- Running plain `npm run test:e2e` does **not** collect coverage because the server isn't serving instrumented files.
- WASM-heavy files (`wasmWorker.js`, `wasmWorkerProxy.js`, `embedding.js`, `inference.js`) will always show low coverage because Cypress Electron does not support WebGPU.

---

## Report Artifacts

| Directory/File | Contents |
|----------------|----------|
| `cypress/results/` | Mochawesome JSON reports (one per spec) + merged HTML report |
| `cypress/results/mochawesome.html` | Merged test report (open in browser) |
| `cypress/screenshots/` | Failure screenshots from test runs |
| `cypress/coverage/` | Istanbul HTML coverage report (requires `test:coverage` or `test:all`) |
| `cypress/coverage/index.html` | Coverage report (open in browser) |
| `.nyc_output/` | Raw coverage data (hidden, used by Istanbul) |
| `js-instrumented/` | Pre-instrumented JS files for coverage (hidden, gitignored) |

---

## Custom Commands Reference

Two custom commands are available in `support/commands.js`:

| Command | Usage | Description |
|---------|-------|-------------|
| `waitForAppReady()` | `cy.waitForAppReady()` | Waits until `#status-bar`, `#sidebar`, and `#chat-panel` are visible (up to 15 s each) |
| `toggleTheme()` | `cy.toggleTheme()` | Clicks `#theme-toggle-btn` and waits 300 ms for the CSS transition |

---

## Code Coverage Notes

- Coverage requires the server to run with `COVERAGE=1` so that instrumented JS files are served from `js-instrumented/` instead of `js/`.
- The instrumented files add Istanbul hooks that send coverage data back to the `@cypress/code-coverage` plugin.
- Coverage data is saved as raw JSON in `.nyc_output/` and converted to an HTML report via `nyc report --reporter=html`.
- Coverage reports use Istanbul's default thresholds. Adjust in `.nycrc` if needed.
- WASM-heavy files (`wasmWorker.js`, `wasmWorkerProxy.js`, `embedding.js`, `inference.js`) typically show low coverage because Cypress's Electron does not support WebGPU, so those code paths are skipped by design.

---

## File Structure

```
cypress/
├── README.md                  # This file
├── support/
│   ├── e2e.js                 # Global setup, coverage support, exception suppression
│   └── commands.js            # Custom Cypress commands
├── fixtures/                  # Test data files (for future use)
└── e2e/                       # All spec files
    ├── app-loading.spec.js
    ├── sidebar.spec.js
    ├── chat-interface.spec.js
    ├── theme.spec.js
    ├── language-selector.spec.js
    ├── help-modal.spec.js
    └── settings.spec.js

# Project root (related files)
├── cypress.config.js          # Cypress config (reporter + coverage tasks)
├── .babelrc                   # Babel plugin-istanbul for coverage
├── .nycrc                     # NYC/Istanbul coverage configuration
├── server.js                  # Dev server (supports COVERAGE=1 mode)
├── run-tests.sh               # All-in-one test runner (coverage + reports)
└── serve-coverage.sh          # Coverage server launcher (with port checking)
```
