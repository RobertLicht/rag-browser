# Cypress E2E Tests — User Guide

How to set up and run the end-to-end test suite for RAG-Browser on **Fedora 43** (and other Linux distros).

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

### Headless Mode (CI-style)

In a second terminal, run all tests without opening a browser window:

```bash
npm run test:e2e
```

This runs all specs against the bundled Electron browser and prints results to the terminal.

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

To run only one test file (useful when developing):

```bash
npx cypress run --browser electron --spec "cypress/e2e/theme.spec.js"
```

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
node server.js          # Terminal 1 — dev server
npm run test:e2e        # Terminal 2 — headless tests
npm run test:e2e:open   # Terminal 2 — interactive GUI
```

---

## Custom Commands Reference

Two custom commands are available in `support/commands.js`:

| Command | Usage | Description |
|---------|-------|-------------|
| `waitForAppReady()` | `cy.waitForAppReady()` | Waits until `#status-bar`, `#sidebar`, and `#chat-panel` are visible (up to 15 s each) |
| `toggleTheme()` | `cy.toggleTheme()` | Clicks `#theme-toggle-btn` and waits 300 ms for the CSS transition |

---

## File Structure

```
cypress/
├── README.md                  # This file
├── support/
│   ├── e2e.js                 # Global exception suppression
│   └── commands.js            # Custom commands
├── fixtures/                  # Test data files (for future use)
└── e2e/                       # All spec files
    ├── app-loading.spec.js
    ├── sidebar.spec.js
    ├── chat-interface.spec.js
    ├── theme.spec.js
    ├── language-selector.spec.js
    ├── help-modal.spec.js
    └── settings.spec.js
```
