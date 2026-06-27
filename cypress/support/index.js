// Istanbul coverage collection — merges __coverage__ from the browser
// into a single map, writes raw JSON to .nyc_output/, and triggers
// the Istanbul HTML report generation.

import istanbul from "istanbul-lib-coverage";

const map = istanbul.createCoverageMap({});

// Capture coverage whenever the browser navigates away from a page.
Cypress.on("window:before:unload", (e) => {
  const coverage = e.currentTarget.__coverage__;

  if (coverage) {
    map.merge(coverage);
  }
});

// After all specs have run, merge any remaining coverage data, persist
// it to disk, and ask Istanbul to generate the HTML report.
after(() => {
  cy.window().then((win) => {
    const coverage = win.__coverage__;

    if (coverage) {
      map.merge(coverage);
    }

    cy.writeFile(".nyc_output/out.json", JSON.stringify(map));
    cy.exec("npx nyc report --reporter=html");
  });
});
