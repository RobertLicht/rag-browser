describe('Settings Panels', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.waitForAppReady();
  });

  describe('Chunking Settings', () => {
    it('expands on summary click', () => {
      cy.get('#chunking-settings summary').click({ force: true });
      cy.get('#chunking-settings').should('be.open');
    });

    it('has three chunk size options', () => {
      cy.get('#chunking-settings summary').click({ force: true });
      cy.get('input[name="chunk-size"]').should('have.length', 3);
    });

    it('defaults to medium (512 tokens)', () => {
      cy.get('#chunking-settings summary').click({ force: true });
      cy.get('input[name="chunk-size"][value="512"]')
        .should('be.checked');
    });

    it('allows switching to large chunk size', () => {
      cy.get('#chunking-settings summary').click({ force: true });
      cy.get('input[name="chunk-size"][value="1024"]').check({ force: true });
      cy.get('input[name="chunk-size"][value="1024"]')
        .should('be.checked');
    });

    it('allows switching to small chunk size', () => {
      cy.get('#chunking-settings summary').click({ force: true });
      cy.get('input[name="chunk-size"][value="256"]').check({ force: true });
      cy.get('input[name="chunk-size"][value="256"]')
        .should('be.checked');
    });
  });

  describe('LLM Settings', () => {
    it('expands on summary click', () => {
      cy.get('#llm-settings summary').click({ force: true });
      cy.get('#llm-settings').should('be.open');
    });

    it('shows the thinking mode toggle', () => {
      cy.get('#llm-settings summary').click({ force: true });
      cy.get('#thinking-toggle').should('exist');
    });

    it('shows generation parameter sliders', () => {
      cy.get('#llm-settings summary').click({ force: true });
      cy.get('#temperature-slider').should('exist');
      cy.get('#top-p-slider').should('exist');
      cy.get('#top-k-slider').should('exist');
      cy.get('#min-p-slider').should('exist');
      cy.get('#presence-penalty-slider').should('exist');
      cy.get('#repetition-penalty-slider').should('exist');
      cy.get('#max-new-tokens-slider').should('exist');
    });

    it('shows slider value displays', () => {
      cy.get('#llm-settings summary').click({ force: true });
      cy.get('#temperature-value').should('be.visible');
      cy.get('#top-p-value').should('be.visible');
      cy.get('#max-new-tokens-value').should('be.visible');
    });

    it('shows reset to preset button', () => {
      cy.get('#llm-settings summary').click({ force: true });
      cy.get('#reset-llm-btn').should('be.visible');
    });

    it('temperature slider defaults to 1.0', () => {
      cy.get('#llm-settings summary').click({ force: true });
      cy.get('#temperature-value').should('contain', '1.0');
    });

    it('allows changing temperature value', () => {
      cy.get('#llm-settings summary').click({ force: true });
      cy.get('#temperature-slider')
        .invoke('val', 0.5)
        .trigger('input');
      cy.get('#temperature-value').should('contain', '0.5');
    });
  });

  describe('Search Settings', () => {
    it('is open by default', () => {
      cy.get('#search-settings').should('have.attr', 'open');
    });

    it('shows search mode selector with hybrid as default', () => {
      cy.get('#search-mode-select')
        .should('have.value', 'hybrid');
    });

    it('allows switching search mode to vector', () => {
      cy.get('#search-mode-select').select('vector');
      cy.get('#search-mode-select')
        .should('have.value', 'vector');
    });

    it('shows top-n slider with correct defaults', () => {
      cy.get('#top-n-slider').should('exist');
      cy.get('#top-n-value').should('contain', '3');
    });

    it('allows changing top-n value', () => {
      cy.get('#top-n-slider')
        .invoke('val', 10)
        .trigger('input');
      cy.get('#top-n-value').should('contain', '10');
    });

    it('shows reset to defaults button', () => {
      cy.get('#reset-settings-btn').should('be.visible');
    });
  });
});
