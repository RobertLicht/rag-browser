#!/usr/bin/env node
//
// generate-coverage-report.js — Self-contained HTML coverage report generator
//
// Reads Istanbul coverage data (.nyc_output/coverage-final.json) and project
// source files, then generates a single self-contained HTML file that works
// via file:// URLs (no server required).
//
// Usage:
//   node scripts/generate-coverage-report.js
//   node scripts/generate-coverage-report.js --input .nyc_output/coverage-final.json
//   node scripts/generate-coverage-report.js --output cypress/results/coverage/index.html
//

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");

// ──────────────────────────────────────────────────────────────────────
//  CLI parsing
// ──────────────────────────────────────────────────────────────────────
// ──────────────────────────────────────────────────────────────────────
//  Input path resolution
//
// Istanbul writes coverage data in different filenames depending on the
// toolchain:
//   - nyc             → .nyc_output/coverage-final.json
//   - @cypress/code-coverage → .nyc_output/out.json
// We auto-detect whichever exists.
// ──────────────────────────────────────────────────────────────────────
function resolveInput(defaultInput) {
  if (fs.existsSync(defaultInput)) return defaultInput;

  // Fallback: look for out.json in the same directory
  const alt = path.join(path.dirname(defaultInput), "out.json");
  if (fs.existsSync(alt)) return alt;

  return defaultInput;
}

function parseArgs() {
  const args = process.argv.slice(2);
  const defaultInput = path.join(
    PROJECT_ROOT,
    ".nyc_output",
    "coverage-final.json",
  );
  const config = {
    input: defaultInput,
    output: path.join(PROJECT_ROOT, "cypress/results/coverage", "index.html"),
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--input" && args[i + 1]) {
      config.input = path.resolve(args[++i]);
    } else if (args[i] === "--output" && args[i + 1]) {
      config.output = path.resolve(args[++i]);
    } else if (args[i] === "--help") {
      console.log(`Usage: node generate-coverage-report.js [options]

Options:
  --input <path>   Path to Istanbul coverage JSON (auto-detects coverage-final.json or out.json)
  --output <path>  Output HTML path (default: cypress/results/coverage/index.html)
  --help           Show this help`);
      process.exit(0);
    }
  }

  // Auto-detect actual coverage file
  config.input = resolveInput(config.input);

  return config;
}

// ──────────────────────────────────────────────────────────────────────
//  Coverage data reading
// ──────────────────────────────────────────────────────────────────────
function readCoverageData(inputPath) {
  if (!fs.existsSync(inputPath)) {
    console.error(`Error: Coverage data not found at: ${inputPath}`);
    console.error(
      "Run tests with coverage first (npm run test:coverage or npm run test:all)",
    );
    process.exit(1);
  }

  const raw = fs.readFileSync(inputPath, "utf-8");
  const coverage = JSON.parse(raw);

  // Istanbul can produce an object of { fileHash: { path, ... } } or { filePath: { ... } }
  const files = {};
  for (const [key, value] of Object.entries(coverage)) {
    if (value && typeof value === "object") {
      const filePath = value.path || value.inputSourceMap?.sources?.[0] || key;
      if (filePath) {
        files[filePath] = value;
      }
    }
  }

  return files;
}

// ──────────────────────────────────────────────────────────────────────
//  Source file reading
// ──────────────────────────────────────────────────────────────────────
function readSourceFile(filePath) {
  // Resolve relative to project root
  let absolutePath = filePath;
  if (!path.isAbsolute(filePath)) {
    absolutePath = path.join(PROJECT_ROOT, filePath);
  }

  try {
    return fs.readFileSync(absolutePath, "utf-8");
  } catch {
    return null;
  }
}

// ──────────────────────────────────────────────────────────────────────
//  Coverage statistics
// ──────────────────────────────────────────────────────────────────────
function computeStats(coverageFiles) {
  let total = { statements: 0, branches: 0, functions: 0, lines: 0 };
  let covered = { statements: 0, branches: 0, functions: 0, lines: 0 };

  for (const [filePath, data] of Object.entries(coverageFiles)) {
    const s = data.s || {}; // statement counts
    const b = data.b || {}; // branch counts
    const f = data.f || {}; // function counts

    // Statements
    for (const count of Object.values(s)) {
      total.statements++;
      if (count > 0) covered.statements++;
    }

    // Branches
    for (const branch of Object.values(b)) {
      if (Array.isArray(branch)) {
        for (const count of branch) {
          total.branches++;
          if (count > 0) covered.branches++;
        }
      }
    }

    // Functions
    for (const count of Object.values(f)) {
      total.functions++;
      if (count > 0) covered.functions++;
    }

    // Lines — derived from statements (Istanbul maps statements to lines)
    // We use fnMap to get line numbers, then deduplicate
    const fnMap = data.fnMap || {};
    const statementMap = data.statementMap || {};
    const lineSet = new Set();
    for (const [, fnInfo] of Object.entries(fnMap)) {
      if (fnInfo && fnInfo.decl && fnInfo.decl.start) {
        lineSet.add(fnInfo.decl.start.line);
      }
    }
    // Also collect statement line numbers
    for (const [, loc] of Object.entries(statementMap)) {
      if (loc && loc.start && loc.start.line) {
        lineSet.add(loc.start.line);
      }
    }

    total.lines += lineSet.size;
    // Approximate covered lines from statements with line info
    let coveredLines = 0;
    const locLines = new Set();
    for (const [stmtKey, count] of Object.entries(s)) {
      const loc = statementMap[stmtKey];
      if (loc && loc.start && loc.start.line) {
        if (count > 0 && !locLines.has(loc.start.line)) {
          locLines.add(loc.start.line);
          coveredLines++;
        }
      }
    }
    covered.lines += coveredLines;
  }

  function pct(num, den) {
    if (den === 0) return 100;
    return Math.round((num / den) * 1000) / 10;
  }

  return {
    total,
    covered,
    statements: pct(covered.statements, total.statements),
    branches: pct(covered.branches, total.branches),
    functions: pct(covered.functions, total.functions),
    lines: pct(covered.lines, total.lines),
    fileCount: Object.keys(coverageFiles).length,
  };
}

// Build per-line coverage for a file
function buildLineCoverage(data, source) {
  if (!source) return { lines: [], totalLines: 0, coveredLines: 0 };

  const s = data.s || {};
  const statementMap = data.statementMap || {};

  const sourceLines = source.split("\n");
  const totalLines = sourceLines.length;

  // Map each statement to its line(s)
  const lineCoverage = new Array(totalLines + 1).fill(null);

  for (const [stmtKey, count] of Object.entries(s)) {
    const loc = statementMap[stmtKey];
    if (loc && loc.start && loc.end) {
      const startLine = loc.start.line;
      const endLine = loc.end.line;
      for (
        let line = startLine;
        line <= endLine && line <= totalLines;
        line++
      ) {
        if (lineCoverage[line] === null || lineCoverage[line] > count) {
          lineCoverage[line] = count;
        }
      }
    }
  }

  let coveredLines = 0;
  const lines = [];
  for (let i = 1; i <= totalLines; i++) {
    const count = lineCoverage[i];
    const hasCoverage = count !== null;
    const isCovered = count > 0;
    const isPartiallyCovered = count === 0;

    if (hasCoverage && isCovered) coveredLines++;

    lines.push({
      num: i,
      text: sourceLines[i - 1] || "",
      count,
      hasCoverage,
      isCovered,
      isPartiallyCovered,
    });
  }

  return { lines, totalLines, coveredLines };
}

// ──────────────────────────────────────────────────────────────────────
//  HTML generation
// ──────────────────────────────────────────────────────────────────────
function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatPct(val) {
  return val.toFixed(1);
}

function formatCount(covered, total) {
  return `${covered}/${total}`;
}

function generateReport(coverageFiles, stats) {
  const generatedAt = new Date().toISOString();

  // Build per-file HTML sections
  const fileSections = [];
  let totalSourceLines = 0;

  // Sort files by coverage percentage (worst first)
  const sortedFiles = Object.entries(coverageFiles)
    .map(([filePath, data]) => {
      const source = readSourceFile(filePath);
      const lcov = buildLineCoverage(data, source || "");
      const filePct =
        lcov.totalLines > 0
          ? Math.round((lcov.coveredLines / lcov.totalLines) * 1000) / 10
          : 100;

      // Compute per-file stats
      let fStatements = 0,
        fCoveredStatements = 0;
      for (const count of Object.values(data.s || {})) {
        fStatements++;
        if (count > 0) fCoveredStatements++;
      }
      let fBranches = 0,
        fCoveredBranches = 0;
      for (const branch of Object.values(data.b || {})) {
        if (Array.isArray(branch)) {
          for (const count of branch) {
            fBranches++;
            if (count > 0) fCoveredBranches++;
          }
        }
      }
      let fFunctions = 0,
        fCoveredFunctions = 0;
      for (const count of Object.values(data.f || {})) {
        fFunctions++;
        if (count > 0) fCoveredFunctions++;
      }

      return {
        filePath,
        data,
        source,
        lcov,
        filePct,
        stats: {
          statements: fStatements,
          coveredStatements: fCoveredStatements,
          branches: fBranches,
          coveredBranches: fCoveredBranches,
          functions: fFunctions,
          coveredFunctions: fCoveredFunctions,
          lines: lcov.totalLines,
          coveredLines: lcov.coveredLines,
        },
      };
    })
    .sort((a, b) => a.filePct - b.filePct);

  for (const file of sortedFiles) {
    const { filePath, lcov, filePct, stats: fStats } = file;
    const displayPath = filePath;

    let linesHtml = "";
    for (const line of lcov.lines) {
      let cls = "line";
      let countHtml = "";
      if (line.hasCoverage) {
        if (line.isCovered) {
          cls = "line line-covered";
          countHtml = `<span class="count" title="Executed ${line.count} time${line.count === 1 ? "" : "s"} during tests">${line.count}</span>`;
        } else {
          cls = "line line-missed";
          countHtml = `<span class="count" title="This line was never executed (not covered by tests)">&mdash;</span>`;
        }
      } else {
        countHtml = `<span class="count"></span>`;
      }

      linesHtml += `<tr class="${cls}">
  <td class="ln">${line.num}</td>
  <td class="cnt">${countHtml}</td>
  <td class="code"><pre>${escapeHtml(line.text)}</pre></td>
</tr>`;
    }

    const fStmtPct =
      fStats.statements > 0
        ? ((fStats.coveredStatements / fStats.statements) * 100).toFixed(1)
        : "100.0";
    const fBranchPct =
      fStats.branches > 0
        ? ((fStats.coveredBranches / fStats.branches) * 100).toFixed(1)
        : "100.0";
    const fFuncPct =
      fStats.functions > 0
        ? ((fStats.coveredFunctions / fStats.functions) * 100).toFixed(1)
        : "100.0";
    const fLinePct =
      fStats.lines > 0
        ? ((fStats.coveredLines / fStats.lines) * 100).toFixed(1)
        : "100.0";

    fileSections.push(`
  <details class="file" open>
    <summary>
      <span class="file-path">${escapeHtml(displayPath)}</span>
      <span class="file-stats">
        <span class="pct statements" title="Statements: % of executable code statements that were run during tests">${fStmtPct}%</span>
        <span class="pct branches" title="Branches: % of conditional branches (if/else paths) that were exercised">${fBranchPct}%</span>
        <span class="pct functions" title="Functions: % of declared functions that were called at least once">${fFuncPct}%</span>
        <span class="pct lines" title="Lines: % of lines with executable code that were executed">${fLinePct}%</span>
      </span>
    </summary>
    <table class="source-table">
      <thead>
        <tr>
          <th class="ln" title="Source code line number">Line</th>
          <th class="cnt" title="How many times this line was executed during tests. &mdash; means the line was never executed.">Hits</th>
          <th class="code">Source</th>
        </tr>
      </thead>
      <tbody>${linesHtml}
      </tbody>
    </table>
  </details>`);
  }

  const stmtCount = formatCount(
    stats.covered.statements,
    stats.total.statements,
  );
  const branchCount = formatCount(stats.covered.branches, stats.total.branches);
  const funcCount = formatCount(stats.covered.functions, stats.total.functions);
  const lineCount = formatCount(stats.covered.lines, stats.total.lines);

  const summaryBar = (pct) => {
    const width = Math.min(100, Math.max(0, pct));
    const color = pct >= 90 ? "#4caf50" : pct >= 70 ? "#ff9800" : "#f44336";
    return `<div class="bar-wrap"><div class="bar" style="width:${width}%;background:${color}"></div><span class="bar-pct">${formatPct(pct)}%</span></div>`;
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>RAG-Browser — Coverage Report</title>
<style>
  :root {
    --bg: #1a1a2e;
    --surface: #16213e;
    --surface2: #0f3460;
    --text: #e0e0e0;
    --text-muted: #9e9e9e;
    --green: #4caf50;
    --orange: #ff9800;
    --red: #f44336;
    --border: #2a2a4a;
    --covered: rgba(76,175,80,0.15);
    --missed: rgba(244,67,54,0.15);
    --mono: 'SF Mono', 'Cascadia Code', 'Fira Code', 'Consolas', monospace;
  }

  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: var(--bg);
    color: var(--text);
    line-height: 1.6;
    padding: 0;
  }

  /* ── Header ─────────────────────────────────────────── */
  .header {
    background: var(--surface);
    border-bottom: 1px solid var(--border);
    padding: 24px 32px;
  }
  .header h1 {
    font-size: 24px;
    font-weight: 600;
    margin-bottom: 4px;
  }
  .header .meta {
    font-size: 13px;
    color: var(--text-muted);
  }

  /* ── Summary cards ──────────────────────────────────── */
  .summary {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 16px;
    padding: 24px 32px;
  }
  .card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 20px;
  }
  .card .label {
    font-size: 13px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-muted);
    margin-bottom: 8px;
  }
  .card .count {
    font-size: 28px;
    font-weight: 700;
    font-family: var(--mono);
  }
  .card .detail {
    font-size: 12px;
    color: var(--text-muted);
    margin-top: 4px;
  }
  .card .bar-wrap {
    margin-top: 12px;
    position: relative;
    background: rgba(255,255,255,0.06);
    border-radius: 4px;
    height: 8px;
    overflow: hidden;
  }
  .card .bar {
    height: 100%;
    border-radius: 4px;
    transition: width 0.3s ease;
  }
  .card .bar-pct {
    position: absolute;
    top: -18px;
    right: 0;
    font-size: 11px;
    font-family: var(--mono);
    color: var(--text-muted);
  }

  /* ── Controls ────────────────────────────────────────── */
  .controls {
    padding: 0 32px 16px;
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }
  .controls button {
    background: var(--surface);
    border: 1px solid var(--border);
    color: var(--text);
    padding: 6px 14px;
    border-radius: 6px;
    font-size: 13px;
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s;
  }
  .controls button:hover {
    background: var(--surface2);
    border-color: #4a4a6a;
  }
  .controls button.active {
    background: var(--surface2);
    border-color: #5a8aff;
    color: #8ab4ff;
  }

  /* ── File list ──────────────────────────────────────── */
  .files {
    padding: 0 32px 40px;
  }
  .file {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 8px;
    margin-bottom: 12px;
    overflow: hidden;
  }
  .file summary {
    padding: 14px 20px;
    cursor: pointer;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    user-select: none;
    list-style: none;
  }
  .file summary::-webkit-details-marker { display: none; }
  .file summary::marker { content: ""; }
  .file summary::before {
    content: "▶";
    display: inline-block;
    width: 16px;
    transition: transform 0.15s;
    font-size: 10px;
    color: var(--text-muted);
  }
  .file[open] summary::before {
    transform: rotate(90deg);
  }
  .file-path {
    font-family: var(--mono);
    font-size: 14px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .file-stats {
    display: flex;
    gap: 8px;
    flex-shrink: 0;
  }
  .file-stats .pct {
    font-family: var(--mono);
    font-size: 12px;
    padding: 2px 8px;
    border-radius: 4px;
    background: rgba(255,255,255,0.06);
  }
  .file-stats .pct.statements { color: #81c784; }
  .file-stats .pct.branches { color: #ffb74d; }
  .file-stats .pct.functions { color: #64b5f6; }
  .file-stats .pct.lines { color: #ce93d8; }

  /* ── Tooltip system ─────────────────────────────────── */
  .pct[title] {
    cursor: help;
    position: relative;
  }
  .pct[title]:hover::after {
    content: attr(title);
    position: absolute;
    bottom: calc(100% + 6px);
    left: 50%;
    transform: translateX(-50%);
    background: #2a2a4a;
    color: #e0e0e0;
    padding: 6px 10px;
    border-radius: 6px;
    font-size: 12px;
    white-space: nowrap;
    z-index: 100;
    pointer-events: none;
    box-shadow: 0 2px 8px rgba(0,0,0,0.4);
    border: 1px solid #4a4a6a;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    line-height: 1.4;
  }
  .pct[title]:hover::before {
    content: "";
    position: absolute;
    bottom: calc(100% + 2px);
    left: 50%;
    transform: translateX(-50%);
    border: 5px solid transparent;
    border-top-color: #2a2a4a;
    z-index: 100;
    pointer-events: none;
  }

  /* ── Legend section ─────────────────────────────────── */
  .legend {
    margin: 0 32px 20px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 16px 20px;
  }
  .legend h3 {
    font-size: 14px;
    font-weight: 600;
    margin-bottom: 10px;
    color: var(--text);
  }
  .legend-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 8px 24px;
  }
  .legend-item {
    display: flex;
    align-items: baseline;
    gap: 8px;
    font-size: 13px;
    line-height: 1.4;
  }
  .legend-swatch {
    flex-shrink: 0;
    width: 14px;
    height: 14px;
    border-radius: 3px;
  }
  .legend-label {
    font-weight: 600;
    color: var(--text);
  }
  .legend-desc {
    color: var(--text-muted);
  }

  /* ── Source table ───────────────────────────────────── */
  .source-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
  }
  .source-table thead th {
    padding: 6px 0;
    text-align: left;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--text-muted);
    background: var(--surface2);
    border-bottom: 1px solid var(--border);
    font-weight: 600;
  }
  .source-table thead th[title] {
    cursor: help;
  }
  .source-table thead th.ln {
    width: 50px;
    text-align: right;
    padding: 6px 12px;
  }
  .source-table thead th.cnt {
    width: 60px;
    text-align: center;
    padding: 6px 8px;
  }
  .source-table thead th.code {
    text-align: left;
    padding: 6px 16px;
  }
  .source-table td {
    padding: 0;
    vertical-align: top;
    border-top: 1px solid var(--border);
  }
  .source-table tr:first-child td { border-top: none; }
  .source-table .ln {
    width: 50px;
    text-align: right;
    padding: 0 12px 0 12px;
    color: var(--text-muted);
    font-family: var(--mono);
    font-size: 12px;
    user-select: none;
    background: rgba(0,0,0,0.15);
    border-right: 1px solid var(--border);
  }
  .source-table .cnt {
    width: 60px;
    text-align: center;
    padding: 0 8px;
    font-family: var(--mono);
    font-size: 12px;
    color: var(--text-muted);
    background: rgba(0,0,0,0.08);
    border-right: 1px solid var(--border);
  }
  .source-table .code pre {
    margin: 0;
    padding: 0 16px;
    font-family: var(--mono);
    font-size: 13px;
    line-height: 1.8;
    white-space: pre;
    overflow-x: visible;
    tab-size: 2;
  }
  .source-table .line line-covered { background: var(--covered); }
  .source-table tr.line-covered { background: var(--covered); }
  .source-table tr.line-missed { background: var(--missed); }

  /* hide missed files toggle */
  .file.hidden { display: none; }
</style>
</head>
<body>

  <div class="header">
    <h1>&#x1f4c8; RAG-Browser — Coverage Report</h1>
    <div class="meta">
      Generated ${escapeHtml(generatedAt)} &middot; ${stats.fileCount} file${stats.fileCount !== 1 ? "s" : ""} analysed
    </div>
  </div>

  <div class="summary">
    <div class="card">
      <div class="label">Statements</div>
      <div class="count">${formatPct(stats.statements)}%</div>
      <div class="detail">${stmtCount}</div>
      ${summaryBar(stats.statements)}
    </div>
    <div class="card">
      <div class="label">Branches</div>
      <div class="count">${formatPct(stats.branches)}%</div>
      <div class="detail">${branchCount}</div>
      ${summaryBar(stats.branches)}
    </div>
    <div class="card">
      <div class="label">Functions</div>
      <div class="count">${formatPct(stats.functions)}%</div>
      <div class="detail">${funcCount}</div>
      ${summaryBar(stats.functions)}
    </div>
    <div class="card">
      <div class="label">Lines</div>
      <div class="count">${formatPct(stats.lines)}%</div>
      <div class="detail">${lineCount}</div>
      ${summaryBar(stats.lines)}
    </div>
  </div>

  <div class="legend">
    <h3>How to Read This Report</h3>
    <div class="legend-grid">
      <div class="legend-item">
        <span class="legend-swatch" style="background:#81c784"></span>
        <span class="legend-label">Statements</span>
        <span class="legend-desc">— % of executable code statements that were run during tests</span>
      </div>
      <div class="legend-item">
        <span class="legend-swatch" style="background:#ffb74d"></span>
        <span class="legend-label">Branches</span>
        <span class="legend-desc">— % of conditional branches (if/else paths) that were exercised</span>
      </div>
      <div class="legend-item">
        <span class="legend-swatch" style="background:#64b5f6"></span>
        <span class="legend-label">Functions</span>
        <span class="legend-desc">— % of declared functions that were called at least once</span>
      </div>
      <div class="legend-item">
        <span class="legend-swatch" style="background:#ce93d8"></span>
        <span class="legend-label">Lines</span>
        <span class="legend-desc">— % of lines with executable code that were executed</span>
      </div>
      <div class="legend-item">
        <span class="legend-swatch" style="background:var(--covered);border:1px solid #4caf50"></span>
        <span class="legend-label">Hit Count (e.g. 50)</span>
        <span class="legend-desc">— how many times that line was executed; green = covered</span>
      </div>
      <div class="legend-item">
        <span class="legend-swatch" style="background:var(--missed);border:1px solid #f44336"></span>
        <span class="legend-label">Missed (—)</span>
        <span class="legend-desc">— line was never executed; red = not covered by tests</span>
      </div>
    </div>
  </div>

  <div class="controls">
    <button id="btn-expand-all">Expand All</button>
    <button id="btn-collapse-all">Collapse All</button>
    <button id="btn-hide-missed">Hide &lt;100%</button>
    <button id="btn-show-all">Show All</button>
  </div>

  <div class="files">
    <p style="padding: 12px 0 4px; color: var(--text-muted); font-size: 13px;">
      Files sorted by coverage (lowest first). Click to expand source view.
    </p>
${fileSections.join("\n")}
  </div>

<script>
(function() {
  const files = document.querySelectorAll('.file');
  const btns = {
    expand:    document.getElementById('btn-expand-all'),
    collapse:  document.getElementById('btn-collapse-all'),
    hide:      document.getElementById('btn-hide-missed'),
    show:      document.getElementById('btn-show-all'),
  };

  btns.expand.addEventListener('click', () => {
    files.forEach(f => f.setAttribute('open', ''));
  });

  btns.collapse.addEventListener('click', () => {
    files.forEach(f => f.removeAttribute('open'));
  });

  btns.hide.addEventListener('click', () => {
    btns.hide.classList.add('active');
    btns.show.classList.remove('active');
    files.forEach(f => {
      const pctEl = f.querySelector('.file-stats .pct.lines');
      if (!pctEl) return;
      const pct = parseFloat(pctEl.textContent);
      if (pct < 100) {
        f.classList.add('hidden');
      } else {
        f.classList.remove('hidden');
      }
    });
  });

  btns.show.addEventListener('click', () => {
    btns.show.classList.add('active');
    btns.hide.classList.remove('active');
    files.forEach(f => f.classList.remove('hidden'));
  });
})();
</script>

</body>
</html>`;
}

// ──────────────────────────────────────────────────────────────────────
//  Main
// ──────────────────────────────────────────────────────────────────────
function main() {
  const config = parseArgs();
  console.log(`Reading coverage data from: ${config.input}`);

  const coverageFiles = readCoverageData(config.input);
  const stats = computeStats(coverageFiles);

  console.log(`Found ${stats.fileCount} instrumented file(s)`);
  console.log(
    `Statements: ${formatPct(stats.statements)}% | ` +
      `Branches: ${formatPct(stats.branches)}% | ` +
      `Functions: ${formatPct(stats.functions)}% | ` +
      `Lines: ${formatPct(stats.lines)}%`,
  );

  const html = generateReport(coverageFiles, stats);

  // Ensure output directory exists
  const outputDir = path.dirname(config.output);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(config.output, html, "utf-8");
  console.log(`\nSelf-contained coverage report written to:`);
  console.log(`  ${config.output}`);
  console.log(`\nThis report can be opened directly in any browser (file://)`);
}

main();
