describe('RAG-Browser Application Loading', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('displays the correct page title', () => {
    cy.title().should('eq', 'RAG-Browser Agent');
  });

  it('renders the main application containers', () => {
    cy.get('#status-bar').should('be.visible');
    cy.get('#app-container').should('be.visible');
    cy.get('#sidebar').should('be.visible');
    cy.get('#chat-panel').should('be.visible');
  });

  it('shows the loading modal element', () => {
    // The modal exists in DOM; visibility depends on model cache state.
    cy.get('#loading-modal').should('exist');
  });

  it('has all status indicators in the status bar', () => {
    cy.get('#hardware-status').should('be.visible');
    cy.get('#model-status').should('be.visible');
    cy.get('#index-status').should('be.visible');
    cy.get('#token-status').should('be.visible');
    cy.get('#memory-status').should('be.visible');
  });

  it('has the language selector, theme toggle and help button', () => {
    cy.get('#lang-selector-btn').should('be.visible');
    cy.get('#theme-toggle-btn').should('be.visible');
    cy.get('#help-btn').should('be.visible');
  });
});
