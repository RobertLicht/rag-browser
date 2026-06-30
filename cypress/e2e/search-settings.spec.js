describe("Search Settings Advanced", () => {
  beforeEach(() => {
    cy.visit("/");
    cy.waitForAppReady();
  });

  describe("Search Mode Options", () => {
    it("has hybrid mode option", () => {
      cy.get("#search-mode-select option[value='hybrid']").should("exist");
    });

    it("has vector mode option", () => {
      cy.get("#search-mode-select option[value='vector']").should("exist");
    });
  });

  describe("Hybrid Weights", () => {
    // The HTML has ONE slider (#text-weight-slider) with TWO label spans:
    //   #text-weight-label  → "BM25: XX%"
    //   #vector-weight-label → "Vector: XX%"
    // There is NO separate vector-weight-slider, text-weight-value, or vector-weight-value.

    it("shows text weight slider in hybrid mode", () => {
      cy.get("#search-mode-select").select("hybrid");
      cy.get("#text-weight-slider").should("exist");
    });

    it("shows text weight label", () => {
      cy.get("#text-weight-label").should("exist");
    });

    it("shows vector weight label", () => {
      cy.get("#vector-weight-label").should("exist");
    });

    it("text weight label defaults to 70%", () => {
      cy.get("#text-weight-label").should("contain", "70");
    });

    it("vector weight label defaults to 30%", () => {
      cy.get("#vector-weight-label").should("contain", "30");
    });

    it("text weight slider has correct range", () => {
      cy.get("#text-weight-slider")
        .should("have.attr", "min", "10")
        .and("have.attr", "max", "90");
    });

    it("allows changing text weight", () => {
      // Changing the slider updates both text-weight-label and vector-weight-label
      cy.get("#text-weight-slider").invoke("val", 50).trigger("input");
      cy.get("#text-weight-label").should("contain", "50");
      cy.get("#vector-weight-label").should("contain", "50");
    });
  });

  describe("Similarity Thresholds", () => {
    it("has hybrid similarity slider", () => {
      cy.get("#hybrid-similarity-slider").should("exist");
    });

    it("has min vector similarity slider", () => {
      cy.get("#min-vector-slider").should("exist");
    });

    it("has vector similarity slider", () => {
      cy.get("#vector-similarity-slider").should("exist");
    });

    it("hybrid similarity defaults to 55%", () => {
      cy.get("#hybrid-similarity-value").should("contain", "55");
    });

    it("min vector similarity defaults to 35%", () => {
      cy.get("#min-vector-value").should("contain", "35");
    });

    it("vector similarity defaults to 70%", () => {
      cy.get("#vector-similarity-value").should("contain", "70");
    });
  });

  describe("Threshold Sections Visibility", () => {
    it("shows hybrid settings section in hybrid mode", () => {
      cy.get("#search-mode-select").select("hybrid");
      cy.get("#hybrid-settings").should("exist");
    });

    it("shows hybrid thresholds section in hybrid mode", () => {
      cy.get("#search-mode-select").select("hybrid");
      cy.get("#hybrid-thresholds").should("exist");
    });

    it("shows vector threshold section in vector mode", () => {
      cy.get("#search-mode-select").select("vector");
      cy.get("#vector-threshold").should("be.visible");
    });
  });

  describe("Top-N Settings", () => {
    it("top-n slider has correct range", () => {
      cy.get("#top-n-slider")
        .should("have.attr", "min", "1")
        .and("have.attr", "max", "20");
    });
  });
});
