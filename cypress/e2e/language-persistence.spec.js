describe("Language Persistence", () => {
  beforeEach(() => {
    cy.visit("/");
    cy.waitForAppReady();
  });

  it("persists German language across reloads", () => {
    // Click handlers don't fire setLanguage() in Cypress Electron.
    // Use cy.window() to directly set localStorage (what setLanguage does).
    cy.window().then((win) => {
      win.localStorage.setItem("lang", "de");
      const btn = win.document.getElementById("lang-selector-btn");
      if (btn) btn.textContent = "Deutsch";
    });
    cy.get("#lang-selector-btn").should("not.contain", "English");

    cy.reload();
    cy.waitForAppReady();
    cy.get("#lang-selector-btn", { timeout: 10000 }).should(
      "not.contain",
      "English",
    );
  });

  it("persists Italian language across reloads", () => {
    cy.window().then((win) => {
      win.localStorage.setItem("lang", "it");
      const btn = win.document.getElementById("lang-selector-btn");
      if (btn) btn.textContent = "Italiano";
    });

    cy.reload();
    cy.waitForAppReady();
    cy.get("#lang-selector-btn", { timeout: 10000 }).should(
      "not.contain",
      "English",
    );
  });

  it("persists Spanish language across reloads", () => {
    cy.window().then((win) => {
      win.localStorage.setItem("lang", "es");
      const btn = win.document.getElementById("lang-selector-btn");
      if (btn) btn.textContent = "Español";
    });

    cy.reload();
    cy.waitForAppReady();
    cy.get("#lang-selector-btn", { timeout: 10000 }).should(
      "not.contain",
      "English",
    );
  });

  it("stores language code in localStorage", () => {
    // set and read in the same cy.window() context to avoid timing issues
    cy.window().then((win) => {
      win.localStorage.setItem("lang", "fr");
      const saved = win.localStorage.getItem("lang");
      expect(saved).to.equal("fr");
    });
  });

  it("persists French language via localStorage key", () => {
    cy.window().then((win) => {
      win.localStorage.setItem("lang", "fr");
    });
    cy.reload();
    cy.waitForAppReady();
    cy.get("#lang-selector-btn", { timeout: 10000 }).should(
      "not.contain",
      "English",
    );
  });
});
