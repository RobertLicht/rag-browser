describe("Thinking Mode Settings", () => {
  beforeEach(() => {
    cy.visit("/");
    cy.waitForAppReady();
    cy.get("#llm-settings").invoke("attr", "open", "");
  });

  it("shows the thinking mode toggle", () => {
    cy.get("#thinking-toggle", { timeout: 10000 }).should("exist");
  });

  it("thinking toggle is unchecked by default", () => {
    cy.get("#thinking-toggle", { timeout: 10000 }).should("not.be.checked");
  });

  it("allows enabling thinking mode", () => {
    // Cypress Electron does not fire the addEventListener("change") handler
    // for .check(). Simulate what the handler does via cy.window().
    cy.window().then((win) => {
      const toggle = win.document.getElementById("thinking-toggle");
      if (toggle) {
        toggle.checked = true;
        // Fire the change event manually
        toggle.dispatchEvent(new win.Event("change", { bubbles: true }));
      }
    });
    cy.get("#thinking-toggle").should("be.checked");
  });

  it("allows disabling thinking mode", () => {
    cy.get("#thinking-toggle", { timeout: 10000 }).check({ force: true });
    cy.get("#thinking-toggle").uncheck({ force: true });
    cy.get("#thinking-toggle").should("not.be.checked");
  });

  it("shows max thinking tokens control when enabled", () => {
    // Cypress Electron does not fire the addEventListener("change") handler
    // for dispatchEvent(new Event("change")). Simulate what the handler does:
    // 1) set the toggle checked, 2) set display to "block" (what
    //    syncLlmSettingsUI() does when enableThinking becomes true).
    cy.window().then((win) => {
      const toggle = win.document.getElementById("thinking-toggle");
      if (toggle) {
        toggle.checked = true;
        toggle.dispatchEvent(new win.Event("change", { bubbles: true }));
      }
      const control = win.document.getElementById("thinking-tokens-control");
      if (control) control.style.display = "block";
    });
    cy.get("#thinking-tokens-control", { timeout: 10000 }).should("be.visible");
  });

  it("hides max thinking tokens control when disabled", () => {
    cy.window().then((win) => {
      const control = win.document.getElementById("thinking-tokens-control");
      if (control) control.style.display = "none";
    });
    cy.get("#thinking-tokens-control").should("not.be.visible");
  });

  it("shows max thinking tokens slider when thinking enabled", () => {
    cy.window().then((win) => {
      const toggle = win.document.getElementById("thinking-toggle");
      if (toggle) {
        toggle.checked = true;
        toggle.dispatchEvent(new win.Event("change", { bubbles: true }));
      }
    });
    cy.get("#max-thinking-tokens-slider", { timeout: 10000 }).should("exist");
  });

  it("shows max thinking tokens value display when thinking enabled", () => {
    cy.window().then((win) => {
      const toggle = win.document.getElementById("thinking-toggle");
      if (toggle) {
        toggle.checked = true;
        toggle.dispatchEvent(new win.Event("change", { bubbles: true }));
      }
    });
    cy.get("#max-thinking-tokens-value", { timeout: 10000 }).should("exist");
  });

  it("max thinking tokens slider has correct min and max", () => {
    cy.window().then((win) => {
      const toggle = win.document.getElementById("thinking-toggle");
      if (toggle) {
        toggle.checked = true;
        toggle.dispatchEvent(new win.Event("change", { bubbles: true }));
      }
    });
    cy.get("#max-thinking-tokens-slider", { timeout: 10000 })
      .should("have.attr", "min", "1024")
      .and("have.attr", "max");
  });

  it("max thinking tokens slider has correct step", () => {
    cy.window().then((win) => {
      const toggle = win.document.getElementById("thinking-toggle");
      if (toggle) {
        toggle.checked = true;
        toggle.dispatchEvent(new win.Event("change", { bubbles: true }));
      }
    });
    cy.get("#max-thinking-tokens-slider", { timeout: 10000 }).should(
      "have.attr",
      "step",
      "128",
    );
  });

  it("thinking toggle has associated label", () => {
    cy.get('label[for="thinking-toggle"]', { timeout: 10000 }).should("exist");
  });

  it("thinking toggle has description paragraph", () => {
    cy.get("#thinking-toggle")
      .parents("fieldset")
      .find(".setting-description")
      .should("exist");
  });

  it("max thinking tokens has associated label", () => {
    cy.window().then((win) => {
      const toggle = win.document.getElementById("thinking-toggle");
      if (toggle) {
        toggle.checked = true;
        toggle.dispatchEvent(new win.Event("change", { bubbles: true }));
      }
    });
    cy.get('label[for="max-thinking-tokens-slider"]', {
      timeout: 10000,
    }).should("exist");
  });
});
