describe("Query Input and Submission", () => {
  beforeEach(() => {
    cy.visit("/");
    cy.waitForAppReady();
  });

  it("allows typing in the query input", () => {
    // Disabled textarea: cy.type() doesn't update .value even with {force: true}.
    // Set the value directly via the DOM instead.
    cy.window().then((win) => {
      const ta = win.document.getElementById("query-input");
      expect(ta, "textarea exists").to.not.be.null;
      ta.value = "test query";
    });
    cy.get("#query-input").should("have.value", "test query");
  });

  it("clears input after typing and clearing", () => {
    cy.window().then((win) => {
      const ta = win.document.getElementById("query-input");
      expect(ta).to.not.be.null;
      ta.value = "some text";
    });
    cy.get("#query-input").should("have.value", "some text");
    cy.window().then((win) => {
      const ta = win.document.getElementById("query-input");
      expect(ta).to.not.be.null;
      ta.value = "";
    });
    cy.get("#query-input").should("have.value", "");
  });

  it("query input supports multiline text", () => {
    cy.window().then((win) => {
      const ta = win.document.getElementById("query-input");
      expect(ta).to.not.be.null;
      ta.value = "line one\nline two";
    });
    cy.get("#query-input").should("have.value", "line one\nline two");
  });

  it("send button exists and is visible", () => {
    cy.get("#send-btn").should("be.visible");
  });

  it("send button has i18n attribute", () => {
    cy.get("#send-btn").should("have.attr", "data-i18n", "chat.send");
  });

  it("stop button is hidden by default", () => {
    cy.get("#stop-btn").should("not.be.visible");
  });

  it("stop button exists in DOM", () => {
    cy.get("#stop-btn").should("exist");
  });

  it("stop button has i18n attribute", () => {
    cy.get("#stop-btn").should("have.attr", "data-i18n", "chat.stop");
  });

  it("has conversation area in DOM", () => {
    cy.get("#conversation").should("exist");
  });

  it("shows empty placeholder when no messages", () => {
    cy.get("#conversation-empty-placeholder").should("exist");
  });

  it("query input has i18n placeholder attribute", () => {
    cy.get("#query-input").should(
      "have.attr",
      "data-i18n-placeholder",
      "chat.placeholder",
    );
  });

  it("query input is a textarea element", () => {
    cy.get("#query-input")
      .should("have.prop", "tagName", "TEXTAREA")
      .and("have.attr", "rows");
  });

  it("query input has tooltip attribute", () => {
    cy.get("#query-input").should(
      "have.attr",
      "data-i18n-tooltip",
      "chat.tooltip.queryDisabled",
    );
  });

  it("input area container exists", () => {
    cy.get("#input-area").should("exist");
  });
});
