describe('Help / About Modal', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.waitForAppReady();
  });

  it('opens the help modal on button click', () => {
    cy.get('#help-btn').click({ force: true });
    cy.get('#help-modal').should('be.visible');
    cy.get('#help-modal h2').should('contain', 'RAG-Browser');
  });

  it('closes the help modal on close button click', () => {
    cy.get('#help-btn').click({ force: true });
    cy.get('#help-modal').should('be.visible');
    cy.get('#help-modal-close').click({ force: true });
    cy.get('#help-modal').should('not.be.visible');
  });

  it('contains an Overview help section', () => {
    cy.get('#help-btn').click({ force: true });
    cy.get('#help-modal .help-section h3').should('contain', 'Overview');
  });

  it('modal is hidden on initial page load', () => {
    cy.get('#help-modal').should('not.be.visible');
  });
});
