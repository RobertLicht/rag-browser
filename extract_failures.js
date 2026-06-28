const fs = require("fs");
const html = fs.readFileSync("cypress/results/index.html", "utf-8");

// Find the data-raw attribute which contains the JSON
const dataRawMatch = html.match(/data-raw="([\s\S]*?)"\s+data-config/);
if (dataRawMatch) {
  const encodedJson = dataRawMatch[1];
  // The JSON might be HTML-escaped, decode it
  const json = encodedJson
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#x27;/g, "'");

  const data = JSON.parse(json);

  // Collect all failed tests
  const failed = [];

  function walkSuites(suites, path = "") {
    for (const suite of suites || []) {
      const suiteTitle = suite.title || "";
      const suitePath = path ? path + " > " + suiteTitle : suiteTitle;

      // Check tests
      for (const test of suite.tests || []) {
        if (test.fail) {
          failed.push({
            title: test.title,
            suite: suitePath,
            file: suite.file || "",
            error: test.err
              ? test.err.message || JSON.stringify(test.err)
              : "No error message",
            state: "failed",
          });
        }
      }

      // Recurse into nested suites
      if (suite.suites && suite.suites.length) {
        walkSuites(suite.suites, suitePath);
      }
    }
  }

  walkSuites(data.results || []);

  console.log(
    "Total tests:",
    data.stats ? data.stats.testsRegistered : "unknown",
  );
  console.log("Total failures:", data.stats ? data.stats.failures : "unknown");
  console.log("Total passed:", data.stats ? data.stats.passes : "unknown");
  console.log("Total pending:", data.stats ? data.stats.pending : "unknown");
  console.log("Total skipped:", data.stats ? data.stats.skipped : "unknown");
  console.log("\n--- FAILING TESTS ---\n");

  failed.forEach((f, i) => {
    console.log(`${i + 1}. Suite: ${f.suite || "(root)"}`);
    console.log(`   Test:  ${f.title}`);
    console.log(`   File:  ${f.file || "N/A"}`);
    console.log(`   Error: ${f.error}`);
    console.log("");
  });

  console.log(`Total failures found: ${failed.length}`);
} else {
  console.error("Could not find data-raw attribute");
  // Print a snippet around data-config to debug
  const configIdx = html.indexOf("data-config");
  if (configIdx > -1) {
    console.log("Context around data-config:");
    console.log(html.substring(configIdx - 200, configIdx + 200));
  }
}
