describe("Settings Panels", () => {
  beforeEach(() => {
    cy.visit("/");
    cy.waitForAppReady();
  });

  describe("Chunking Settings", () => {
    it("expands on summary click", () => {
      cy.window().then((win) => {
        const summary = win.document
          .querySelector("#chunking-settings summary")
          ?.click();
      });
      cy.wait(50);
      cy.window().then((win) => {
        const details = win.document.getElementById("chunking-settings");
        expect(details, "chunking details exists").to.not.be.null;
        expect(details.open, "chunking details is open").to.be.true;
      });
    });

    it("has three chunk size options", () => {
      cy.get("#chunking-settings").invoke("attr", "open", "");
      cy.get('input[name="chunk-size"]', { timeout: 10000 }).should(
        "have.length",
        3,
      );
    });

    it("defaults to medium (512 tokens)", () => {
      cy.get("#chunking-settings").invoke("attr", "open", "");
      cy.get('input[name="chunk-size"][value="512"]', {
        timeout: 10000,
      }).should("be.checked");
    });

    it("allows switching to large chunk size", () => {
      cy.get("#chunking-settings").invoke("attr", "open", "");
      cy.get('input[name="chunk-size"][value="1024"]', {
        timeout: 10000,
      }).check({ force: true });
      cy.get('input[name="chunk-size"][value="1024"]').should("be.checked");
    });

    it("allows switching to small chunk size", () => {
      cy.get("#chunking-settings").invoke("attr", "open", "");
      cy.get('input[name="chunk-size"][value="256"]', { timeout: 10000 }).check(
        { force: true },
      );
      cy.get('input[name="chunk-size"][value="256"]').should("be.checked");
    });
  });

  describe("LLM Settings", () => {
    it("expands on summary click", () => {
      cy.window().then((win) => {
        win.document.querySelector("#llm-settings summary")?.click();
      });
      cy.wait(50);
      cy.window().then((win) => {
        const details = win.document.getElementById("llm-settings");
        expect(details, "llm details exists").to.not.be.null;
        expect(details.open, "llm details is open").to.be.true;
      });
    });

    it("shows the thinking mode toggle", () => {
      cy.get("#llm-settings").invoke("attr", "open", "");
      cy.get("#thinking-toggle").should("exist");
    });

    it("shows generation parameter sliders", () => {
      cy.get("#llm-settings").invoke("attr", "open", "");
      cy.get("#temperature-slider", { timeout: 10000 }).should("exist");
      cy.get("#top-p-slider").should("exist");
      cy.get("#top-k-slider").should("exist");
      cy.get("#min-p-slider").should("exist");
      cy.get("#presence-penalty-slider").should("exist");
      cy.get("#repetition-penalty-slider").should("exist");
      cy.get("#max-new-tokens-slider").should("exist");
    });

    it("shows slider value displays", () => {
      cy.get("#llm-settings").invoke("attr", "open", "");
      cy.get("#temperature-value", { timeout: 10000 }).should("exist");
      cy.get("#top-p-value").should("exist");
      cy.get("#max-new-tokens-value").should("exist");
    });

    it("shows reset to preset button", () => {
      cy.get("#llm-settings").invoke("attr", "open", "");
      cy.get("#reset-llm-btn", { timeout: 10000 }).should("exist");
    });

    it("temperature slider defaults to 1.0", () => {
      cy.get("#llm-settings").invoke("attr", "open", "");
      cy.get("#temperature-value", { timeout: 10000 }).should("contain", "1.0");
    });

    it("allows changing temperature value", () => {
      cy.get("#llm-settings").invoke("attr", "open", "");
      cy.get("#temperature-slider", { timeout: 10000 })
        .invoke("val", 0.5)
        .trigger("input");
      cy.get("#temperature-value").should("contain", "0.5");
    });
  });

  describe("Search Settings", () => {
    it("is open by default", () => {
      cy.get("#search-settings").should("have.attr", "open");
    });

    it("shows search mode selector with hybrid as default", () => {
      cy.get("#search-mode-select").should("have.value", "hybrid");
    });

    it("allows switching search mode to vector", () => {
      cy.get("#search-mode-select").select("vector");
      cy.get("#search-mode-select").should("have.value", "vector");
    });

    it("shows top-n slider with correct defaults", () => {
      cy.get("#top-n-slider").should("exist");
      cy.get("#top-n-value").should("contain", "3");
    });

    it("allows changing top-n value", () => {
      cy.get("#top-n-slider").invoke("val", 10).trigger("input");
      cy.get("#top-n-value").should("contain", "10");
    });

    it("shows reset to defaults button", () => {
      cy.get("#reset-settings-btn").should("exist");
    });
  });
});
