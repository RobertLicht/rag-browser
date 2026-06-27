// server.js — Local development server for RAG-Browser
//
// Serves the app with COOP/COEP headers required for SharedArrayBuffer,
// which enables multi-threaded WASM inference via ONNX Runtime Web.
//
// Without these headers, the browser blocks SharedArrayBuffer and the
// WASM backend falls back to single-threaded mode (3-4x slower).
//
// Usage:
//   node server.js                     # Starts app on port 3000
//   PORT=8080 node server.js           # Starts app on port 8080
//   node server.js --coverage-report   # Serves coverage report on port 3001
//   COVERAGE_PORT=8080 node server.js --coverage-report
//
// Then open: http://localhost:3000 (app) or http://localhost:3001 (coverage)

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const COVERAGE = process.env.COVERAGE === "1";
const COVERAGE_REPORT_MODE = process.argv.includes("--coverage-report");
const APP_PORT = parseInt(process.env.PORT || "3000", 10);
const COVERAGE_PORT = parseInt(process.env.COVERAGE_PORT || "3001", 10);

// MIME types for common file extensions
const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".wasm": "application/wasm",
  ".txt": "text/plain; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
};

const server = http.createServer((req, res) => {
  const serveFile = (filePath, fallbackDir = null) => {
    const ext = path.extname(filePath);
    const mimeType = MIME_TYPES[ext] || "application/octet-stream";

    fs.readFile(filePath, (err, data) => {
      if (err) {
        if (err.code === "ENOENT") {
          // Try serving index.html for SPA-like routing (only for non-file paths)
          if (!ext && !req.url.includes(".") && fallbackDir) {
            const indexPath = path.join(fallbackDir, "index.html");
            fs.readFile(indexPath, (err2, data2) => {
              if (err2) {
                res.writeHead(404, { "Content-Type": "text/plain" });
                res.end("404 Not Found");
                return;
              }
              res.writeHead(200, {
                "Content-Type": "text/html; charset=utf-8",
              });
              res.end(data2);
            });
          } else {
            res.writeHead(404, { "Content-Type": "text/plain" });
            res.end("404 Not Found: " + req.url);
          }
        } else {
          res.writeHead(500, { "Content-Type": "text/plain" });
          res.end("500 Internal Server Error");
        }
        return;
      }

      res.writeHead(200, { "Content-Type": mimeType });
      res.end(data);
    });
  };

  if (COVERAGE_REPORT_MODE) {
    // ── Coverage report mode: serve cypress/results/coverage/ ──────
    const coverageDir = path.join(__dirname, "cypress", "results", "coverage");
    const filePath = path.join(
      coverageDir,
      req.url === "/" ? "index.html" : req.url.slice(1),
    );
    serveFile(filePath, coverageDir);
    return;
  }

  // ── App mode: COOP/COEP headers for SharedArrayBuffer ───────────
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
  res.setHeader("Cross-Origin-Resource-Policy", "same-origin");

  // Resolve the requested file path
  let filePath = path.join(__dirname, req.url === "/" ? "index.html" : req.url);

  // When COVERAGE=1, redirect /js/* requests to /js-instrumented/*
  if (COVERAGE && req.url.startsWith("/js/")) {
    filePath = path.join(__dirname, "js-instrumented" + req.url.slice(3));
  }
  serveFile(filePath, __dirname);
});

const port = COVERAGE_REPORT_MODE ? COVERAGE_PORT : APP_PORT;

server.listen(port, () => {
  if (COVERAGE_REPORT_MODE) {
    console.log(
      `Coverage report server running at http://localhost:${COVERAGE_PORT}`,
    );
    console.log(`Serving: ${path.join(__dirname, "cypress", "coverage")}`);
  } else {
    console.log(
      `RAG-Browser dev server running at http://localhost:${APP_PORT}`,
    );
    console.log(
      "COOP/COEP headers enabled — SharedArrayBuffer available for multi-threaded WASM",
    );
  }
});
