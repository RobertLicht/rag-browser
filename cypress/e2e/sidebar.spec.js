describe('Sidebar — Document Management', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.waitForAppReady();
  });

  it('shows the document upload area', () => {
    cy.get('#file-input').should('exist');
    cy.get('#format-hint').should('be.visible');
  });

  it('shows model management buttons', () => {
    cy.get('#load-models-btn').should('be.visible');
    cy.get('#unload-embedding-btn').should('be.visible').and('be.disabled');
    cy.get('#unload-llm-btn').should('be.visible').and('be.disabled');
  });

  it('shows database action buttons', () => {
    cy.get('#export-db-btn').should('be.visible');
    cy.get('#import-db-btn').should('be.visible');
    cy.get('#clear-db-btn').should('be.visible');
  });

  it('shows the clear chat button', () => {
    cy.get('#clear-chat-btn').should('be.visible');
  });

  it('shows settings panel summaries', () => {
    cy.get('#chunking-settings summary').should('exist');
    cy.get('#llm-settings summary').should('exist');
    cy.get('#search-settings summary').should('exist');
  });
});
