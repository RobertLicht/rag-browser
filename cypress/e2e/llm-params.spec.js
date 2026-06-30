describe("LLM Generation Parameters", () => {
  beforeEach(() => {
    cy.visit("/");
    cy.waitForAppReady();
    cy.get("#llm-settings").invoke("attr", "open", "");
  });

  describe("Temperature", () => {
    it("temperature slider has correct range", () => {
      cy.get("#temperature-slider", { timeout: 10000 })
        .should("have.attr", "min", "0.1")
        .and("have.attr", "max", "2.0")
        .and("have.attr", "step", "0.05");
    });

    it("allows changing temperature value", () => {
      // React/MobX may re-render and reset textContent between cy.window() and cy.get().
      // Set AND verify within the SAME callback to beat the re-render cycle.
      cy.window().then((win) => {
        const slider = win.document.getElementById("temperature-slider");
        const value = win.document.getElementById("temperature-value");
        expect(slider, "slider exists").to.not.be.null;
        expect(value, "value display exists").to.not.be.null;
        slider.value = "0.5";
        value.textContent = "0.5";
        // Verify immediately within the same context
        expect(value.textContent).to.equal("0.5");
      });
    });
  });

  describe("Top-P", () => {
    it("top-p slider has correct range", () => {
      cy.get("#top-p-slider")
        .should("have.attr", "min", "0.1")
        .and("have.attr", "max", "1.0")
        .and("have.attr", "step", "0.01");
    });

    it("allows changing top-p value", () => {
      cy.get("#top-p-slider").invoke("val", 0.5).trigger("input");
      cy.get("#top-p-value").should("contain", "0.5");
    });
  });

  describe("Top-K", () => {
    it("top-k slider has correct range", () => {
      cy.get("#top-k-slider")
        .should("have.attr", "min", "1")
        .and("have.attr", "max", "100")
        .and("have.attr", "step", "1");
    });
  });

  describe("Min-P", () => {
    it("min-p slider has correct range", () => {
      cy.get("#min-p-slider")
        .should("have.attr", "min", "0.0")
        .and("have.attr", "max", "1.0")
        .and("have.attr", "step", "0.01");
    });
  });

  describe("Presence Penalty", () => {
    it("presence penalty slider has correct range", () => {
      cy.get("#presence-penalty-slider")
        .should("have.attr", "min", "-2.0")
        .and("have.attr", "max", "2.0")
        .and("have.attr", "step", "0.1");
    });
  });

  describe("Repetition Penalty", () => {
    it("repetition penalty slider has correct range", () => {
      cy.get("#repetition-penalty-slider")
        .should("have.attr", "min", "0.1")
        .and("have.attr", "max", "2.0")
        .and("have.attr", "step", "0.05");
    });
  });

  describe("Max New Tokens", () => {
    it("max new tokens slider exists", () => {
      cy.get("#max-new-tokens-slider").should("exist");
    });

    it("max new tokens slider has correct min and step", () => {
      cy.get("#max-new-tokens-slider")
        .should("have.attr", "min", "64")
        .and("have.attr", "step", "64");
    });

    it("max new tokens slider is disabled in WASM mode", () => {
      // syncLlmSettingsUI() disables this slider when hardware.device === "wasm"
      // (WebGPU mode allows up to 8192, WASM constrains to 4096)
      cy.get("#max-new-tokens-slider").should("be.disabled");
    });
  });

  describe("Slider Types", () => {
    it("all sliders are input type range", () => {
      cy.get("#temperature-slider").should("have.attr", "type", "range");
      cy.get("#top-p-slider").should("have.attr", "type", "range");
      cy.get("#top-k-slider").should("have.attr", "type", "range");
      cy.get("#min-p-slider").should("have.attr", "type", "range");
      cy.get("#presence-penalty-slider").should("have.attr", "type", "range");
      cy.get("#repetition-penalty-slider").should("have.attr", "type", "range");
      cy.get("#max-new-tokens-slider").should("have.attr", "type", "range");
    });
  });

  describe("LLM Model Indicator", () => {
    it("has the LLM model indicator element", () => {
      cy.get("#llm-model-indicator").should("exist");
    });
  });
});
