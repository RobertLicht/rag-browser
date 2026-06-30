describe("WebGPU Warning Banner", () => {
  beforeEach(() => {
    cy.visit("/");
    cy.waitForAppReady();
  });

  it("has the WebGPU warning banner in DOM", () => {
    cy.get("#webgpu-warning-banner").should("exist");
  });

  it("WebGPU warning banner is hidden by default", () => {
    cy.window().then((win) => {
      const banner = win.document.getElementById("webgpu-warning-banner");
      expect(banner, "banner exists").to.not.be.null;
      expect(banner.style.display).to.equal("none");
    });
  });

  it("has the warning icon SVG", () => {
    cy.get(".webgpu-warning-icon").should("exist");
  });

  it("has the warning text with i18n attributes", () => {
    cy.get("[data-i18n='banner.webgpu.unavailable']").should("exist");
    cy.get("[data-i18n='banner.webgpu.slower']").should("exist");
  });

  it("has the WebGPU help button", () => {
    cy.get("#webgpu-help-btn").should("exist");
  });

  it("WebGPU help button has i18n attribute", () => {
    cy.get("#webgpu-help-btn").should(
      "have.attr",
      "data-i18n",
      "banner.webgpu.enable",
    );
  });

  it("shows banner when made visible", () => {
    cy.window().then((win) => {
      const banner = win.document.getElementById("webgpu-warning-banner");
      banner.style.display = "block";
    });
    cy.get("#webgpu-warning-banner", { timeout: 5000 }).should("be.visible");
  });

  it("banner content structure is correct", () => {
    cy.window().then((win) => {
      const banner = win.document.getElementById("webgpu-warning-banner");
      const content = banner.querySelector(".webgpu-warning-content");
      expect(content, "content wrapper exists").to.not.be.null;
      expect(content.querySelector(".webgpu-warning-icon"), "icon exists").to
        .not.be.null;
      expect(content.querySelector(".webgpu-warning-text"), "text exists").to
        .not.be.null;
      expect(content.querySelector("#webgpu-help-btn"), "help button exists").to
        .not.be.null;
    });
  });
});
