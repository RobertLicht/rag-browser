import { createRequire } from "module";

const require = createRequire(import.meta.url);

export default {
  e2e: {
    baseUrl: "http://localhost:3000",
    supportFile: "cypress/support/e2e.js",
    specPattern: "cypress/e2e/**/*.spec.js",
    viewportWidth: 1280,
    viewportHeight: 720,
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
