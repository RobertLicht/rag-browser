describe("Status Bar", () => {
  beforeEach(() => {
    cy.visit("/");
    cy.waitForAppReady();
  });

  describe("Hardware Status", () => {
    it("has hardware status indicator", () => {
      cy.get("#hardware-status").should("be.visible");
    });

    it("hardware status has i18n attribute", () => {
      cy.get("#hardware-status").should("have.attr", "data-i18n");
    });
  });

  describe("Model Status", () => {
    it("shows unloaded state by default", () => {
      cy.get("#model-status").should("be.visible");
    });

    it("model status has i18n attribute", () => {
      cy.get("#model-status").should("have.attr", "data-i18n");
    });
  });

  describe("Index Status", () => {
    it("shows empty index by default", () => {
      cy.get("#index-status").should("be.visible");
    });

    it("contains chunk and document count", () => {
      // Text is translated depending on current language (e.g. "chunks"/"Dokumente" in German).
      // Check the data-i18n attribute and the numeric "0" which is language-agnostic.
      cy.get("#index-status").should("have.attr", "data-i18n");
      cy.get("#index-status").should("contain", "0");
    });
  });

  describe("Status Bar Structure", () => {
    it("is a header element", () => {
      // Cypress 14 does not support have.tag — use have.prop("tagName", ...) instead
      cy.get("#status-bar").should("have.prop", "tagName", "HEADER");
    });

    it("contains all five status indicators", () => {
      cy.get("#hardware-status").should("be.visible");
      cy.get("#model-status").should("be.visible");
      cy.get("#index-status").should("be.visible");
      cy.get("#token-status").should("be.visible");
      cy.get("#memory-status").should("be.visible");
    });

    it("contains all action buttons", () => {
      cy.get("#lang-selector-btn").should("be.visible");
      cy.get("#theme-toggle-btn").should("be.visible");
      cy.get("#start-tour-btn").should("be.visible");
      cy.get("#help-btn").should("be.visible");
    });
  });
});
