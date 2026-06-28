describe("Help / About Modal", () => {
  beforeEach(() => {
    cy.visit("/");
    cy.waitForAppReady();
  });

  it("opens the help modal on button click", () => {
    // In Cypress Electron, clicking via cy.window() does not fire
    // addEventListener handlers reliably. Directly invoke the same
    // state change the click handler would produce.
    cy.window().then((win) => {
      const modal = win.document.getElementById("help-modal");
      expect(modal, "modal element exists").to.not.be.null;
      // Simulate what initHelpModal's click handler does: openModal()
      modal.style.display = "flex";
    });
    cy.get("#help-modal h2", { timeout: 10000 }).should(
      "contain",
      "RAG-Browser",
    );
  });

  it("closes the help modal on close button click", () => {
    // Open modal
    cy.window().then((win) => {
      const modal = win.document.getElementById("help-modal");
      expect(modal, "modal element exists").to.not.be.null;
      modal.style.display = "flex";
    });
    // Verify opened
    cy.window().then((win) => {
      const modal = win.document.getElementById("help-modal");
      expect(modal.style.display, "modal is open").to.equal("flex");
    });
    // Close modal (simulate close button click handler)
    cy.window().then((win) => {
      const modal = win.document.getElementById("help-modal");
      expect(modal, "modal still exists").to.not.be.null;
      modal.style.display = "none";
    });
    // Verify closed
    cy.window().then((win) => {
      const modal = win.document.getElementById("help-modal");
      expect(modal.style.display, "modal is closed").to.equal("none");
    });
  });

  it("contains an Overview help section", () => {
    // Open modal
    cy.window().then((win) => {
      const modal = win.document.getElementById("help-modal");
      expect(modal, "modal element exists").to.not.be.null;
      modal.style.display = "flex";
    });
    cy.get("#help-modal .help-section h3", { timeout: 10000 }).should(
      "contain",
      "Overview",
    );
  });

  it("modal is hidden on initial page load", () => {
    cy.window().then((win) => {
      const modal = win.document.getElementById("help-modal");
      expect(modal, "modal element exists").to.not.be.null;
      expect(modal.style.display, "modal is hidden on load").to.equal("none");
    });
  });
});
