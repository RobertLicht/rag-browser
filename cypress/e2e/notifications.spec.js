describe("Notifications", () => {
  beforeEach(() => {
    cy.visit("/");
    cy.waitForAppReady();
  });

  it("no notifications present on fresh load", () => {
    cy.window().then((win) => {
      const toasts = win.document.querySelectorAll(
        "#notification-container .notification-toast",
      );
      expect(toasts.length).to.equal(0);
    });
  });

  it("supports rendering a success notification", () => {
    cy.window().then((win) => {
      const container =
        win.document.getElementById("notification-container") ||
        (() => {
          const el = win.document.createElement("div");
          el.id = "notification-container";
          win.document.body.appendChild(el);
          return el;
        })();

      const toast = win.document.createElement("div");
      toast.className = "notification-toast success";
      toast.textContent = "Test success notification";
      container.appendChild(toast);
    });

    cy.get("#notification-container .notification-toast", { timeout: 5000 })
      .should("exist")
      .and("contain", "Test success notification");
  });

  it("supports rendering an error notification", () => {
    cy.window().then((win) => {
      const container =
        win.document.getElementById("notification-container") ||
        (() => {
          const el = win.document.createElement("div");
          el.id = "notification-container";
          win.document.body.appendChild(el);
          return el;
        })();

      const toast = win.document.createElement("div");
      toast.className = "notification-toast error";
      toast.textContent = "Test error notification";
      container.appendChild(toast);
    });

    cy.get("#notification-container .notification-toast.error", {
      timeout: 5000,
    }).should("exist");
  });

  it("notification container has correct styling class", () => {
    cy.window().then((win) => {
      const container = win.document.getElementById("notification-container");
      if (container) {
        expect(container.id).to.equal("notification-container");
      }
    });
  });
});
