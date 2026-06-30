describe("Loading Modal Structure", () => {
  beforeEach(() => {
    cy.visit("/");
    cy.waitForAppReady();
  });

  it("has the loading modal in DOM", () => {
    cy.get("#loading-modal").should("exist");
  });

  it("loading modal is hidden by default", () => {
    cy.window().then((win) => {
      const modal = win.document.getElementById("loading-modal");
      expect(modal, "modal exists").to.not.be.null;
      expect(modal.style.display).to.equal("none");
    });
  });

  it("has modal title with i18n attribute", () => {
    cy.get("#modal-title").should(
      "have.attr",
      "data-i18n",
      "modal.loading.title",
    );
  });

  it("has modal description with i18n attribute", () => {
    cy.get("#modal-description").should(
      "have.attr",
      "data-i18n",
      "modal.loading.description",
    );
  });

  it("has embedding model step", () => {
    cy.get("#step-embedding").should("exist");
  });

  it("has LLM model step", () => {
    cy.get("#step-llm").should("exist");
  });

  it("has embedding step label with i18n", () => {
    cy.get("#step-embedding .step-label").should(
      "have.attr",
      "data-i18n",
      "modal.loading.step.embedding",
    );
  });

  it("has LLM step label with i18n", () => {
    cy.get("#step-llm .step-label").should(
      "have.attr",
      "data-i18n",
      "modal.loading.step.llm",
    );
  });

  it("has step progress elements for both models", () => {
    cy.get("#step-embedding-progress").should("exist");
    cy.get("#step-llm-progress").should("exist");
  });

  it("has modal progress bar", () => {
    cy.get(".modal-progress-bar").should("exist");
  });

  it("has modal progress fill element", () => {
    cy.get("#modal-progress-fill").should("exist");
  });

  it("has modal total progress text", () => {
    cy.get("#modal-total-progress").should("exist");
  });

  it("has modal device badge container", () => {
    cy.get("#modal-device-badge").should("exist");
  });

  it("has modal spinner", () => {
    cy.get(".modal-spinner").should("exist");
  });

  it("has step icons", () => {
    cy.get("#step-embedding .step-icon").should("exist");
    cy.get("#step-llm .step-icon").should("exist");
  });

  it("has modal steps container", () => {
    cy.get(".modal-steps").should("exist");
  });

  it("has modal content wrapper", () => {
    cy.get(".modal-content").should("exist");
  });
});
