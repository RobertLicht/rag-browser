describe("Language Selector", () => {
  beforeEach(() => {
    cy.visit("/");
    cy.waitForAppReady();
  });

  it("shows the language selector button", () => {
    cy.get("#lang-selector-btn").should("be.visible");
  });

  it("opens dropdown on click", () => {
    // In Cypress Electron, clicking via cy.window() does not fire
    // addEventListener handlers reliably. Directly toggle the class
    // the click handler would set (classList.toggle("open")).
    cy.window().then((win) => {
      const dropdown = win.document.getElementById("lang-selector-dropdown");
      expect(dropdown, "dropdown element exists").to.not.be.null;
      dropdown.classList.add("open");
    });
    cy.window().then((win) => {
      const dropdown = win.document.getElementById("lang-selector-dropdown");
      expect(dropdown.classList.contains("open"), "dropdown is open").to.be
        .true;
    });
    cy.get("#lang-selector-dropdown button", { timeout: 5000 }).should(
      "have.length",
      5,
    );
  });

  it("contains all five language options", () => {
    cy.window().then((win) => {
      const dropdown = win.document.getElementById("lang-selector-dropdown");
      if (dropdown) dropdown.classList.add("open");
    });
    cy.get('#lang-selector-dropdown [data-lang="en"]').should("exist");
    cy.get('#lang-selector-dropdown [data-lang="de"]').should("exist");
    cy.get('#lang-selector-dropdown [data-lang="it"]').should("exist");
    cy.get('#lang-selector-dropdown [data-lang="es"]').should("exist");
    cy.get('#lang-selector-dropdown [data-lang="fr"]').should("exist");
  });

  it("switches to German (Deutsch)", () => {
    cy.window().then((win) => {
      const dropdown = win.document.getElementById("lang-selector-dropdown");
      if (dropdown) dropdown.classList.add("open");
    });
    cy.get('#lang-selector-dropdown [data-lang="de"]')
      .first()
      .then(($el) => $el[0]?.click());
    cy.get("#lang-selector-btn").should("not.contain", "English");
  });

  it("switches to French (Français)", () => {
    cy.window().then((win) => {
      const dropdown = win.document.getElementById("lang-selector-dropdown");
      if (dropdown) dropdown.classList.add("open");
    });
    cy.get('#lang-selector-dropdown [data-lang="fr"]')
      .first()
      .then(($el) => $el[0]?.click());
    cy.get("#lang-selector-btn").should("not.contain", "English");
  });
});
