describe('Theme Toggle', () => {
  beforeEach(() => {
    // Clear persisted theme so we start from a known state (defaults to dark)
    cy.visit('/');
    cy.window().then((win) => {
      win.localStorage.removeItem('theme');
    });
    cy.reload();
    cy.waitForAppReady();
  });

  it('defaults to dark theme', () => {
    cy.get('html').should('have.attr', 'data-theme', 'dark');
  });

  it('toggles to light theme on button click', () => {
    cy.toggleTheme();
    cy.get('html').should('have.attr', 'data-theme', 'light');
  });

  it('persists theme selection across reloads', () => {
    cy.toggleTheme(); // switch to light
    cy.get('html').should('have.attr', 'data-theme', 'light');
    cy.reload();
    cy.waitForAppReady();
    cy.get('html').should('have.attr', 'data-theme', 'light');
  });

  it('toggles back to dark theme on second click', () => {
    cy.toggleTheme(); // light
    cy.toggleTheme(); // dark
    cy.get('html').should('have.attr', 'data-theme', 'dark');
  });
});
