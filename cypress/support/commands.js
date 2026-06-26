// Custom Cypress commands for RAG-Browser

/**
 * Wait for the app to be fully loaded (core DOM elements visible).
 */
Cypress.Commands.add('waitForAppReady', () => {
  cy.get('#status-bar', { timeout: 15000 }).should('be.visible');
  cy.get('#sidebar', { timeout: 15000 }).should('be.visible');
  cy.get('#chat-panel', { timeout: 15000 }).should('be.visible');
});

/**
 * Click the theme toggle button and wait for transition.
 */
Cypress.Commands.add('toggleTheme', () => {
  cy.get('#theme-toggle-btn').click({ force: true });
  cy.wait(300); // CSS transition time
});
