describe("Info Bar and Footer", () => {
  beforeEach(() => {
    cy.visit("/");
    cy.waitForAppReady();
  });

  describe("Info Bar", () => {
    it("has the info bar in DOM", () => {
      cy.get("#info-bar").should("exist");
    });

    it("info bar contains lock icon SVG", () => {
      cy.get(".info-bar-icon").should("exist");
    });

    it("info bar contains privacy notice with i18n", () => {
      cy.get("[data-i18n='infoBar.private']").should("exist");
    });

    it("info bar contains powered by section", () => {
      cy.get("[data-i18n-html='infoBar.poweredBy']").should("exist");
    });

    it("info bar has Transformers.js link", () => {
      cy.get("#info-bar a[href*='transformers.js']").should("exist");
    });

    it("info bar has GitHub link", () => {
      cy.get(".info-bar-github").should("exist");
    });

    it("info bar has GitHub icon SVG", () => {
      cy.get(".info-bar-github-icon").should("exist");
    });

    it("info bar links open in new tab", () => {
      cy.get("#info-bar a[target='_blank']").should("have.length.gte", 1);
    });

    it("info bar has left and right sections", () => {
      cy.get(".info-bar-left").should("exist");
      cy.get(".info-bar-right").should("exist");
    });
  });

  describe("Footer", () => {
    it("has the footer element", () => {
      cy.get("footer").should("exist");
    });

    it("footer has app-footer id", () => {
      cy.get("#app-footer").should("exist");
    });

    it("footer contains text with i18n", () => {
      cy.get("footer [data-i18n='footer.text']").should("exist");
    });
  });
});
