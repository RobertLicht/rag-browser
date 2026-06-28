// Custom Cypress commands for RAG-Browser

/**
 * Wait for the app to be fully loaded (core DOM elements visible).
 */
Cypress.Commands.add("waitForAppReady", () => {
  cy.get("#status-bar", { timeout: 15000 }).should("be.visible");
  cy.get("#sidebar", { timeout: 15000 }).should("be.visible");
  cy.get("#chat-panel", { timeout: 15000 }).should("be.visible");
});

/**
 * Click the theme toggle button and wait for the theme change to apply.
 * Uses native DOM .click() via cy.window() to ensure the JS event listener
 * fires reliably in the Cypress Electron environment.
 */
Cypress.Commands.add("toggleTheme", () => {
  cy.window().then((win) => {
    win.document.getElementById("theme-toggle-btn")?.click();
  });
  // Allow a small window for the theme attribute to update on <html>
  cy.get("html", { timeout: 2000 }).should("have.attr", "data-theme");
});
