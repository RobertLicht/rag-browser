describe('Chat Interface', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.waitForAppReady();
  });

  it('shows the query input area', () => {
    cy.get('#query-input').should('be.visible');
    cy.get('#send-btn').should('be.visible');
  });

  it('has a placeholder on the query input', () => {
    cy.get('#query-input').should('have.attr', 'placeholder');
  });

  it('stop button is hidden by default', () => {
    cy.get('#stop-btn').should('not.be.visible');
  });

  it('shows the conversation empty placeholder', () => {
    cy.get('#conversation-empty-placeholder').should('exist');
  });

  it('query input starts empty', () => {
    cy.get('#query-input').should('have.value', '');
  });
});
