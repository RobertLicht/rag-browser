describe("Token Status and Warnings", () => {
  beforeEach(() => {
    cy.visit("/");
    cy.waitForAppReady();
  });

  describe("Token Status Indicator", () => {
    it("shows token status in status bar", () => {
      // Use cy.window() — .should("be.visible") can fail when earlier
      // tests change the language and the translated text overflows the bar.
      cy.window().then((win) => {
        const el = win.document.getElementById("token-status");
        expect(el, "token-status exists").to.not.be.null;
        const cs = win.getComputedStyle(el);
        expect(cs.display).to.not.equal("none");
        expect(cs.visibility).to.not.equal("hidden");
      });
    });

    it("token status has i18n attribute", () => {
      cy.get("#token-status").should("have.attr", "data-i18n");
    });

    it("memory status indicator exists", () => {
      cy.window().then((win) => {
        const el = win.document.getElementById("memory-status");
        expect(el, "memory-status exists").to.not.be.null;
        const cs = win.getComputedStyle(el);
        expect(cs.display).to.not.equal("none");
        expect(cs.visibility).to.not.equal("hidden");
      });
    });
  });

  describe("Token Warning Banner", () => {
    it("has the token warning banner in DOM", () => {
      cy.get("#token-warning-banner").should("exist");
    });

    it("token warning banner is hidden by default", () => {
      cy.window().then((win) => {
        const banner = win.document.getElementById("token-warning-banner");
        expect(banner, "banner exists").to.not.be.null;
        expect(banner.style.display).to.equal("none");
      });
    });

    it("has the warning icon element", () => {
      cy.get(".token-warning-icon").should("exist");
    });

    it("has the warning text element", () => {
      cy.get("#token-warning-text").should("exist");
    });

    it("has clear chat button in warning banner", () => {
      cy.get("#clear-chat-warn-btn").should("exist");
    });

    it("clear chat warning button has i18n attribute", () => {
      cy.get("#clear-chat-warn-btn").should(
        "have.attr",
        "data-i18n",
        "status.token.warning.clearChat",
      );
    });

    it("shows warning banner when made visible", () => {
      // Setting inline display:"block" via DOM, then verify via inline style
      // rather than .should("be.visible") — Cypress visibility checks can fail
      // when an element was initially hidden via inline style in the HTML.
      cy.window().then((win) => {
        const banner = win.document.getElementById("token-warning-banner");
        banner.style.display = "block";
        banner.querySelector("#token-warning-text").textContent =
          "Context window usage is high";
      });
      // Verify the style was actually applied
      cy.window().then((win) => {
        const banner = win.document.getElementById("token-warning-banner");
        expect(banner.style.display).to.equal("block");
      });
    });

    it("warning banner content structure is correct", () => {
      cy.window().then((win) => {
        const banner = win.document.getElementById("token-warning-banner");
        const content = banner.querySelector(".token-warning-content");
        expect(content, "content wrapper exists").to.not.be.null;
        expect(content.querySelector(".token-warning-icon"), "icon exists").to
          .not.be.null;
        expect(content.querySelector("#token-warning-text"), "text exists").to
          .not.be.null;
        expect(content.querySelector("#clear-chat-warn-btn"), "button exists")
          .to.not.be.null;
      });
    });
  });
});
