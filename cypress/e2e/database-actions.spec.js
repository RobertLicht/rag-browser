describe("Database Actions", () => {
  beforeEach(() => {
    cy.visit("/");
    cy.waitForAppReady();
  });

  it("has export database button", () => {
    cy.get("#export-db-btn").should("be.visible");
  });

  it("has import database button", () => {
    cy.get("#import-db-btn").should("be.visible");
  });

  it("has clear database button", () => {
    cy.get("#clear-db-btn").should("be.visible");
  });

  it("export button has i18n attribute", () => {
    cy.get("#export-db-btn").should("have.attr", "data-i18n", "db.export");
  });

  it("import button has i18n attribute", () => {
    cy.get("#import-db-btn").should("have.attr", "data-i18n", "db.import");
  });

  it("clear button has i18n attribute", () => {
    cy.get("#clear-db-btn").should("have.attr", "data-i18n", "db.clear");
  });

  it("has database actions container", () => {
    cy.get("#db-actions").should("exist");
  });

  it("has hidden import file input", () => {
    cy.get("#import-db-input").should("exist");
    cy.get("#import-db-input").should("have.attr", "type", "file");
    cy.get("#import-db-input").should("have.attr", "accept", ".json");
  });

  it("import file input is hidden by default", () => {
    cy.get("#import-db-input").should("not.be.visible");
  });
});
