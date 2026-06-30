describe("Settings Reset", () => {
  beforeEach(() => {
    cy.visit("/");
    cy.waitForAppReady();
  });

  describe("Search Settings Reset", () => {
    it("has the reset settings button", () => {
      cy.get("#reset-settings-btn").should("exist");
    });

    it("reset settings button has i18n attribute", () => {
      cy.get("#reset-settings-btn").should(
        "have.attr",
        "data-i18n",
        "settings.btn.resetDefaults",
      );
    });

    it("resets search mode to hybrid after change", () => {
      cy.get("#search-mode-select").select("vector");
      cy.get("#search-mode-select").should("have.value", "vector");

      cy.window().then((win) => {
        win.document.getElementById("reset-settings-btn")?.click();
      });

      cy.get("#search-mode-select", { timeout: 5000 }).should(
        "have.value",
        "hybrid",
      );
    });

    it("resets top-n to default after change", () => {
      cy.get("#top-n-slider").invoke("val", 10).trigger("input");
      cy.get("#top-n-value").should("contain", "10");

      cy.window().then((win) => {
        win.document.getElementById("reset-settings-btn")?.click();
      });

      cy.get("#top-n-value", { timeout: 5000 }).should("contain", "3");
    });

    it("resets hybrid similarity threshold after change", () => {
      cy.get("#hybrid-similarity-slider").invoke("val", 90).trigger("input");
      cy.get("#hybrid-similarity-value").should("contain", "90");

      cy.window().then((win) => {
        win.document.getElementById("reset-settings-btn")?.click();
      });

      cy.get("#hybrid-similarity-value", { timeout: 5000 }).should(
        "contain",
        "55",
      );
    });
  });

  describe("LLM Settings Reset", () => {
    it("has the reset LLM button", () => {
      cy.get("#llm-settings").invoke("attr", "open", "");
      cy.get("#reset-llm-btn", { timeout: 10000 }).should("exist");
    });

    it("reset LLM button has i18n attribute", () => {
      cy.get("#llm-settings").invoke("attr", "open", "");
      cy.get("#reset-llm-btn").should(
        "have.attr",
        "data-i18n",
        "settings.llm.btn.resetPreset",
      );
    });

    it("resets temperature to preset after change", () => {
      cy.get("#llm-settings").invoke("attr", "open", "");

      cy.get("#temperature-slider", { timeout: 10000 })
        .invoke("val", 0.1)
        .trigger("input");
      cy.get("#temperature-value").should("contain", "0.1");

      cy.window().then((win) => {
        win.document.getElementById("reset-llm-btn")?.click();
      });

      cy.get("#temperature-value", { timeout: 5000 }).should(
        "not.contain",
        "0.1",
      );
    });
  });
});
