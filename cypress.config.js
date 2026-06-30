import { createRequire } from "module";

const require = createRequire(import.meta.url);

export default {
  e2e: {
    baseUrl: "http://localhost:3000",
    supportFile: "cypress/support/e2e.js",
    // Explicit spec ordering:
    // 1) tour runs first — dismisses the onboarding popup
    // 2) app-loading sets a known baseline (models loaded, clean localStorage)
    // 3) remaining specs run alphabetically
    specPattern: [
      "cypress/e2e/tour.spec.js",
      "cypress/e2e/app-loading.spec.js",
      "cypress/e2e/chat-clear.spec.js",
      "cypress/e2e/chat-interface.spec.js",
      "cypress/e2e/database-actions.spec.js",
      "cypress/e2e/document-upload.spec.js",
      "cypress/e2e/help-modal.spec.js",
      "cypress/e2e/info-bar-footer.spec.js",
      "cypress/e2e/language-persistence.spec.js",
      "cypress/e2e/language-selector.spec.js",
      "cypress/e2e/llm-params.spec.js",
      "cypress/e2e/loading-modal.spec.js",
      "cypress/e2e/notifications.spec.js",
      "cypress/e2e/query.spec.js",
      "cypress/e2e/search-settings.spec.js",
      "cypress/e2e/settings-reset.spec.js",
      "cypress/e2e/settings.spec.js",
      "cypress/e2e/sidebar.spec.js",
      "cypress/e2e/status-bar.spec.js",
      "cypress/e2e/theme.spec.js",
      "cypress/e2e/thinking-mode.spec.js",
      "cypress/e2e/token-status.spec.js",
      "cypress/e2e/webgpu-banner.spec.js",
    ],
    viewportWidth: 1920,
    viewportHeight: 1080,
    defaultCommandTimeout: 10000,
    pageLoadTimeout: 30000,
    video: false,
    screenshotOnRunFailure: true,
    reporter: "cypress-mochawesome-reporter",
    reporterOptions: {
      reportDir: "cypress/results",
      chart: true,
      pageTitle: "RAG-Browser Test Report",
      embeddedScreenshots: true,
      inlineAssets: true,
      saveAllAttempts: true,
    },
    setupNodeEvents(on, config) {
      require("cypress-mochawesome-reporter/plugin")(on);
      require("@cypress/code-coverage/task")(on, config);
      on("file:preprocessor", require("@cypress/code-coverage/use-babelrc"));
      return config;
    },
  },
};
