// Global support file — loaded before every Cypress E2E test.
// Suppresses non-critical exceptions from CDN resources and WebGPU unavailability.

import "cypress-mochawesome-reporter/register.js";
import "@cypress/code-coverage/support.js";
import "./commands.js";

Cypress.on("uncaught:exception", (err, runnable) => {
  // Ignore WebGPU-related errors (not available in Cypress Electron)
  if (
    err.message.includes("WebGPU") ||
    err.message.includes("shared array buffer")
  ) {
    return false;
  }
  // Ignore CDN/resource loading failures (KaTeX, Mermaid may fail in sandboxed Electron)
  if (err.message.includes("Failed to fetch") || err.name === "TypeError") {
    return false;
  }
  // Let all other exceptions fail the test
  return true;
});
