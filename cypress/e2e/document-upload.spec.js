describe("Document Upload Area", () => {
  beforeEach(() => {
    cy.visit("/");
    cy.waitForAppReady();
  });

  it("has file input element", () => {
    cy.get("#file-input").should("exist");
  });

  it("file input accepts multiple files", () => {
    cy.get("#file-input").should("have.attr", "multiple");
  });

  it("file input accepts correct file types", () => {
    cy.get("#file-input").should(
      "have.attr",
      "accept",
      ".txt,.md,.csv,.xls,.xlsx,.docx,.pptx,.odt,.ods,.odp,.pdf",
    );
  });

  it("has file input wrapper", () => {
    cy.get("#file-input-wrapper").should("exist");
  });

  it("file input wrapper has tooltip attribute", () => {
    cy.get("#file-input-wrapper").should(
      "have.attr",
      "data-i18n-tooltip",
      "sidebar.tooltip.embeddingRequired",
    );
  });

  it("has format hint text", () => {
    cy.get("#format-hint").should("be.visible");
  });

  it("format hint lists supported formats", () => {
    cy.get("#format-hint").should("contain", ".txt");
    cy.get("#format-hint").should("contain", ".pdf");
  });

  it("has document list element", () => {
    cy.get("#document-list").should("exist");
  });

  it("document list is empty on fresh load", () => {
    cy.window().then((win) => {
      const list = win.document.getElementById("document-list");
      const items = list?.querySelectorAll("li");
      expect(items?.length || 0).to.equal(0);
    });
  });

  it("has upload progress container", () => {
    cy.get("#upload-progress").should("exist");
  });

  it("has load models button with i18n", () => {
    cy.get("#load-models-btn").should(
      "have.attr",
      "data-i18n",
      "sidebar.btn.loadModels",
    );
  });

  it("has unload embedding button with i18n", () => {
    cy.get("#unload-embedding-btn").should(
      "have.attr",
      "data-i18n",
      "sidebar.btn.unloadEmbedding",
    );
  });

  it("has unload LLM button with i18n", () => {
    cy.get("#unload-llm-btn").should(
      "have.attr",
      "data-i18n",
      "sidebar.btn.unloadLlm",
    );
  });
});
