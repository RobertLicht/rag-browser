const fs = require("fs");

const html = fs.readFileSync("cypress/results/index.html", "utf8");

// Find the embedded results JSON - it appears after "results":
const startIndex = html.indexOf('"results":[');
if (startIndex === -1) {
  console.log("No results found in HTML");
  process.exit(1);
}

// Find the closing bracket of the results array by counting brackets
let start = startIndex + '"results:['.length;
let depth = 1;
let i = start;
while (depth > 0 && i < html.length) {
  if (html[i] === "[") depth++;
  else if (html[i] === "]") depth--;
  i++;
}

const resultsStr = html.slice(start, i - 1);
let results;
try {
  results = JSON.parse(resultsStr);
} catch (e) {
  console.log("Failed to parse results JSON:", e.message);
  process.exit(1);
}

console.log("Number of result sets:", results.length);

const rootSuite = results[0];
const suites = rootSuite.results;

let totalTests = 0;
let totalPassed = 0;
let totalFailed = 0;
const failures = [];

suites.forEach((suite) => {
  console.log(`\nSuite: ${suite.fullFile || suite.title}`);
  (suite.tests || []).forEach((test) => {
    totalTests++;
    if (test.state === "passed") {
      totalPassed++;
    } else if (test.state === "failed") {
      totalFailed++;
      failures.push({
        suite: suite.fullFile || suite.title,
        test: test.title,
        error: test.err?.message?.substring(0, 300) || "No error message",
      });
    }
  });
});

console.log(`\n=== SUMMARY ===`);
console.log(`Total tests: ${totalTests}`);
console.log(`Passed: ${totalPassed}`);
console.log(`Failed: ${totalFailed}`);
console.log(`\n=== FAILURES ===`);
failures.forEach((f, i) => {
  console.log(`\n${i + 1}. [${f.suite}] ${f.test}`);
  console.log(`   Error: ${f.error}`);
});
