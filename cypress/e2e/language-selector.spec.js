describe('Language Selector', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.waitForAppReady();
  });

  it('shows the language selector button', () => {
    cy.get('#lang-selector-btn').should('be.visible');
  });

  it('opens dropdown on click', () => {
    cy.get('#lang-selector-btn').click({ force: true });
    cy.get('#lang-selector-dropdown').should('be.visible');
    cy.get('#lang-selector-dropdown button').should('have.length', 5);
  });

  it('contains all five language options', () => {
    cy.get('#lang-selector-btn').click({ force: true });
    cy.get('#lang-selector-dropdown [data-lang="en"]').should('exist');
    cy.get('#lang-selector-dropdown [data-lang="de"]').should('exist');
    cy.get('#lang-selector-dropdown [data-lang="it"]').should('exist');
    cy.get('#lang-selector-dropdown [data-lang="es"]').should('exist');
    cy.get('#lang-selector-dropdown [data-lang="fr"]').should('exist');
  });

  it('switches to German (Deutsch)', () => {
    cy.get('#lang-selector-btn').click({ force: true });
    cy.get('#lang-selector-dropdown [data-lang="de"]').click({ force: true });
    // After i18n switch, the button should no longer show "English"
    cy.get('#lang-selector-btn').should('not.contain', 'English');
  });

  it('switches to French (Français)', () => {
    cy.get('#lang-selector-btn').click({ force: true });
    cy.get('#lang-selector-dropdown [data-lang="fr"]').click({ force: true });
    cy.get('#lang-selector-btn').should('not.contain', 'English');
  });
});
