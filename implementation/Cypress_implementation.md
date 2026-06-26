# Cypress E2E Testing — Implementation Plan for RAG-Browser

| Field         | Value                                                    |
|---------------|----------------------------------------------------------|
| **Project**   | RAG-Browser — Client-Side RAG Agent                     |
| **Document**  | Cypress E2E Testing Implementation Plan                  |
| **Date**      | 2026-06-26                                               |
| **Target OS** | Fedora 43 (x64)                                          |
| **Status**    | Implemented                                              |

---

## Executive Summary

This plan defines how to integrate **Cypress 14+** for End-to-End testing of the RAG-Browser application on **Fedora 43**. The app is a pure static web application served via `server.js` (Node.js HTTP server with COOP/COEP headers). Cypress runs in headless mode against `http://localhost:3000`, verifying UI structure, interactions, and settings panels.

The existing example files under `examples/Cypress_Testing/` are **Windows-specific** (`.bat`, `.ps1`, Chocolatey, NTLM auth) and are **not applicable** to this project or Fedora. They served only as structural inspiration for folder layout.

---

## Research Findings & Key Decisions

### OS Compatibility — Confirmed

The [official Cypress docs](https://docs.cypress.io/app/get-started/install-cypress) explicitly list:

| Requirement | Version |
|-------------|---------|
| **Fedora** | `>=43` ✅ |
| Node.js | `20.x`, `22.x`, `>=24.x` |
| npm | `>=10.1.0` (or yarn/pnpm/bun equivalents) |

### Linux System Dependencies (Fedora / dnf)

Cypress requires X11 libraries for running Electron even in headless mode:

```bash
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

Derived from the Amazon Linux 2023 (`dnf install -y xorg-x11-server-Xvfb gtk3-devel nss alsa-lib`) and Arch (`pacman -S gtk3 alsa-lib xorg-server-xvfb libxss nss libnotify`) dependency lists in the Cypress docs, mapped to Fedora RPM names.

### Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Location** | Embedded in project root | Standard pattern; shares `package.json`; simpler CI integration |
| **Language** | ES module JavaScript | Matches existing `"type": "module"` codebase; no TS compiler needed |
| **Browser** | Electron (bundled) | Always available; no extra install; works on CI out of the box |
| **Config** | `cypress.config.js` with `export default` | ES module syntax matching project convention |

---

## Scope of Tests (Phase 1 — MVP)

The initial suite focuses on **fast, deterministic UI tests** that do NOT require models to be loaded or documents processed.

### Testable Features (No Model Required)

| # | Feature | What to Assert |
|---|---------|---------------|
| 1 | App loads | Page title; main containers exist |
| 2 | Status bar | All 5 status indicators visible |
| 3 | Sidebar structure | Upload area, model buttons, DB action buttons present |
| 4 | Chat interface | Textarea and send button visible; stop button hidden |
| 5 | Theme toggle | `#theme-toggle-btn` toggles `data-theme`; persists across reloads |
| 6 | Language selector | Dropdown opens; contains 5 language options; switching works |
| 7 | Help modal | Opens/closes on click; contains Overview section |
| 8 | Settings panels | Chunking, LLM, Search `<details>` expand/collapse correctly |
| 9 | Slider controls | Temperature, top-n sliders update display values |
| 10 | Radio buttons | Chunk size radio group selects correctly |

### Out of Scope (Phase 2+)

| Feature | Reason Excluded |
|---------|----------------|
| Model loading (`#load-models-btn`) | Takes minutes; requires WebGPU/WASM; non-deterministic timing |
| Document upload & ingestion | Requires file fixtures + embedding model loaded |
| RAG query/response flow | Requires both models loaded + documents indexed |
| Database import/export | Complex async IndexedDB operations |

---

## Implementation Files

### File Inventory

| # | File | Purpose |
|---|------|---------|
| 1 | `package.json` | Updated with Cypress dependency, npm scripts |
| 2 | `cypress.config.js` | E2E configuration: baseUrl, timeouts, viewport, video disabled |
| 3 | `cypress/support/e2e.js` | Global exception handler (WebGPU, CDN errors suppressed) |
| 4 | `cypress/support/commands.js` | Custom commands: `waitForAppReady`, `toggleTheme` |
| 5 | `cypress/e2e/app-loading.spec.js` | Page title, containers, status indicators (5 tests) |
| 6 | `cypress/e2e/sidebar.spec.js` | Upload area, model buttons, DB actions (5 tests) |
| 7 | `cypress/e2e/chat-interface.spec.js` | Query input, send button, empty state (5 tests) |
| 8 | `cypress/e2e/theme.spec.js` | Dark default, toggle to light, persistence (4 tests) |
| 9 | `cypress/e2e/language-selector.spec.js` | Dropdown, 5 languages, switching DE/FR (5 tests) |
| 10 | `cypress/e2e/help-modal.spec.js` | Open/close modal, content verification (4 tests) |
| 11 | `cypress/e2e/settings.spec.js` | Chunking sizes, LLM sliders, Search mode (17 tests) |
| 12 | `.gitignore` | Added Cypress artifact ignore rules |

### Test Coverage Summary

| Spec File | Tests |
|-----------|-------|
| `app-loading.spec.js` | 5 |
| `sidebar.spec.js` | 5 |
| `chat-interface.spec.js` | 5 |
| `theme.spec.js` | 4 |
| `language-selector.spec.js` | 5 |
| `help-modal.spec.js` | 4 |
| `settings.spec.js` | 17 |
| **Total** | **45** |

### Configuration Decisions

| Setting | Value | Rationale |
|---------|-------|-----------|
| `baseUrl` | `http://localhost:3000` | Matches `server.js` default port |
| `video` | `false` | Saves disk I/O; can enable per-test for debugging |
| `defaultCommandTimeout` | `10000ms` | Default 4s too short for CDN resources (KaTeX, Mermaid) |
| `pageLoadTimeout` | `30000ms` | CDN resources may take time on first load |

---

## Project Structure

```
rag-v2-qwen3.6-27b/
├── cypress.config.js                    # Cypress configuration (ESM)
├── package.json                         # Updated: name, scripts, devDependencies
├── .gitignore                           # Updated: Cypress ignore rules added
│
├── cypress/
│   ├── support/
│   │   ├── e2e.js                       # Global exception suppression handler
│   │   └── commands.js                  # Custom commands (waitForAppReady, toggleTheme)
│   ├── fixtures/                        # Default Cypress fixture directory
│   └── e2e/
│       ├── app-loading.spec.js          # Page load & skeleton tests (5 tests)
│       ├── sidebar.spec.js              # Sidebar elements tests (5 tests)
│       ├── chat-interface.spec.js       # Chat input area tests (5 tests)
│       ├── theme.spec.js                # Theme toggle + persistence (4 tests)
│       ├── language-selector.spec.js    # i18n language switching (5 tests)
│       ├── help-modal.spec.js           # Help modal open/close (4 tests)
│       └── settings.spec.js             # Settings panels deep test (17 tests)
│
├── server.js                            # Static file server (port 3000)
├── index.html                           # Main app HTML
├── css/
│   └── styles.css
├── js/
│   ├── app.js, hardware.js, state.js, ...
└── docs/, examples/, images/, implementation/
```

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| CDN deps (KaTeX, Mermaid) fail in Electron | Tests may hang on page load | `pageLoadTimeout: 30000`; suppress fetch errors in `uncaught:exception` |
| WebGPU not available in Electron → app errors | Noise in test output; potential crashes | Suppress WebGPU errors globally; tests focus on UI structure only |
| COOP/COEP headers block SharedArrayBuffer | WASM falls back to single-threaded | App handles gracefully — no test impact (tests don't require AI) |
| `server.js` port 3000 already in use | Tests cannot connect | Document that server must be running; CI action handles auto-start |
| `localStorage` persists between tests | Theme/lang state leaks | Theme spec clears `localStorage.theme` in `beforeEach` |
| CSS transitions cause timing issues | Flaky assertions after clicks | `cy.wait(300)` after theme toggle; `{ force: true }` on small buttons |

---

## Future Enhancements (Phase 2+)

| Enhancement | Description |
|-------------|-------------|
| **Document upload flow** | Use `cy.fixture()` with sample `.txt`/`.pdf`; verify file appears in `#document-list` |
| **Model loading tests** | Use `cy.intercept()` to stub Transformers.js model downloads; verify modal progress UI |
| **RAG query flow** | Stub embedding + generation pipeline; verify chat messages appear in `#conversation` |
| **Service worker tests** | Verify offline mode works after initial load |
| **Visual regression** | Integrate `cypress-visual-regression` plugin for snapshot comparison |
| **Accessibility audit** | Integrate `cypress-axe` to run WCAG checks on every spec |
| **Chrome browser testing** | Add Chrome as second browser target (`--browser chrome`) |
| **CI/CD pipeline** | GitHub Actions workflow with `cypress-io/github-action@v6` |

---

## CI/CD Integration (Future)

```yaml
# .github/workflows/cypress-e2e.yml
name: Cypress E2E Tests
on: [push, pull_request]

jobs:
  e2e:
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 22

      - name: Install dependencies
        run: npm ci

      - name: Run Cypress
        uses: cypress-io/github-action@v6
        with:
          start: node server.js
          wait-on: 'http://localhost:3000'
          browser: electron
```

---

## Comparison with Existing Windows Examples

| Aspect | This Implementation (Linux/Electron) | Existing (`examples/Cypress_Testing/`) |
|--------|--------------------------------------|---------------------------------------|
| **OS** | Fedora 43 (dnf packages) | Windows 11 (.bat, .ps1, Chocolatey) |
| **Auth** | None — public local dev server | NTLM auth (corporate network) |
| **Structure** | Embedded in project root | Separate project directory (`VITCypressTesting/`) |
| **Config format** | ES modules (`export default`) | CommonJS (`require`) |
| **Reporting** | Native Cypress reporter | Mochawesome + JSON merging |
| **Dependencies** | Only `cypress` (lean) | 12 packages (code-coverage, xpath, NTLM…) |
| **Test count** | 7 specs, 45 tests for RAG-Browser | ~15 tests for a completely different app (VIT) |
| **Browser** | Electron (bundled) | Chrome (requires install) |

---

## Estimated Effort

| Task | Time Estimate |
|------|--------------|
| System dependency installation (Fedora) | ~5 min |
| Node.js / npm verification | ~5 min |
| `package.json` update + Cypress install | ~10 min (binary download) |
| Config files (`cypress.config.js`, support files) | ~15 min |
| Write 7 spec files (45 tests) | ~45 min |
| Debug initial failures (CDN, timing) | ~30 min |
| CI workflow creation | ~15 min |
| **Total** | **~2–2.5 hours** |

---

## Quick-Start Checklist

```
□  sudo dnf install system dependencies (see §OS Compatibility)
□  Verify node >= 20.x and npm >= 10.1.0
□  npm install          (installs Cypress + downloads binary)
□  npx cypress install  (if npm 12+ blocks postinstall scripts; use: npm approve-scripts cypress)
□  node server.js       (Terminal 1 — start dev server on port 3000)
□  npm run test:e2e     (Terminal 2 — run all tests headlessly)
□  npm run test:e2e:open (to interactively explore tests in the Cypress GUI)
□  Verify all 45 tests pass green
```

### Troubleshooting

- **"Can't connect to server"**: Make sure `node server.js` is running. Test with `curl http://localhost:3000`.
- **"Electron not found"**: Run `npx cypress verify` to download the bundled browser.
- **"Specs not found"**: Check that `cypress/e2e/*.spec.js` matches `specPattern` in config.
- **Tests pass locally but fail in CI**: Use `start-server-and-test` or `cypress-io/github-action` for orchestration.
- **npm 12+ blocks Cypress binary download**: Run `npm approve-scripts cypress` OR add `"allowScripts": ["cypress"]` to `package.json`.

---

## Notes & Observations

### Search Mode Options (Verified)

The `#search-mode-select` in `index.html` has exactly two options:
- `hybrid` (selected by default) — "Hybrid (Recommended)"
- `vector` — "Vector Only"

There is **no `keyword` option**. The settings spec was written accordingly.

### Test Design Philosophy

All tests validate **DOM presence, visibility, initial state, and simple interactions** only. No test triggers AI inference or depends on IndexedDB being populated. This ensures:
- Tests run in seconds, not minutes
- Tests are deterministic — same result every time
- No WebGPU/WASM dependency for the test suite
- CI runs are fast and reliable

### Exception Suppression Strategy

The `cypress/support/e2e.js` file suppresses three categories of uncaught exceptions:
1. **WebGPU errors** — Not available in Cypress's bundled Electron
2. **SharedArrayBuffer errors** — COOP/COEP headers work differently in Electron sandbox
3. **CDN fetch failures** — KaTeX and Mermaid from jsDelivr may fail in sandboxed mode

This is intentional: the test suite validates UI structure, not AI inference or markdown rendering quality. Errors that *are* relevant to functionality will still fail tests (the handler returns `true` for unknown exceptions).
