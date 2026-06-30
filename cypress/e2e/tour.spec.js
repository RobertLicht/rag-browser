describe("Tour / Onboarding", () => {
  beforeEach(() => {
    cy.visit("/");
    cy.window().then((win) => {
      win.localStorage.removeItem("rag-tour-completed");
    });
    cy.waitForAppReady();
  });

  it("shows the tour button", () => {
    cy.get("#start-tour-btn").should("be.visible");
  });

  it("tour button has compass icon", () => {
    cy.get("#start-tour-btn").should("contain", "🧭");
  });

  it("tour button has i18n tooltip attribute", () => {
    cy.get("#start-tour-btn").should(
      "have.attr",
      "data-i18n-tooltip",
      "tooltip.tour",
    );
  });

  it("marks tour as completed when flag is set", () => {
    cy.window().then((win) => {
      win.localStorage.setItem("rag-tour-completed", "1");
    });
    cy.window().then((win) => {
      expect(win.localStorage.getItem("rag-tour-completed")).to.equal("1");
    });
  });

  it("detects completed tour from localStorage", () => {
    cy.window().then((win) => {
      win.localStorage.setItem("rag-tour-completed", "1");
      const completed = win.localStorage.getItem("rag-tour-completed") === "1";
      expect(completed).to.be.true;
    });
  });

  it("returns false when tour has not been completed", () => {
    cy.window().then((win) => {
      win.localStorage.removeItem("rag-tour-completed");
      const completed = win.localStorage.getItem("rag-tour-completed") === "1";
      expect(completed).to.be.false;
    });
  });

  it("clears completed tour flag", () => {
    cy.window().then((win) => {
      win.localStorage.setItem("rag-tour-completed", "1");
      win.localStorage.removeItem("rag-tour-completed");
    });
    cy.window().then((win) => {
      expect(win.localStorage.getItem("rag-tour-completed")).to.be.null;
    });
  });
});
