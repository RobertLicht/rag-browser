describe("Chat Clearing", () => {
  beforeEach(() => {
    cy.visit("/");
    cy.waitForAppReady();
  });

  it("has the clear chat button", () => {
    cy.get("#clear-chat-btn").should("be.visible");
  });

  it("clear chat button has i18n attribute", () => {
    cy.get("#clear-chat-btn").should(
      "have.attr",
      "data-i18n",
      "sidebar.btn.clearChat",
    );
  });

  it("conversation area is empty on fresh load", () => {
    cy.window().then((win) => {
      const conversation = win.document.getElementById("conversation");
      const messages = conversation?.querySelectorAll(".message");
      expect(messages?.length || 0).to.equal(0);
    });
  });

  it("empty placeholder is visible on fresh load", () => {
    cy.get("#conversation-empty-placeholder").should("exist");
  });

  it("empty placeholder has i18n attribute", () => {
    cy.get("#conversation-empty-placeholder").should(
      "have.attr",
      "data-i18n",
      "chat.empty",
    );
  });
});
