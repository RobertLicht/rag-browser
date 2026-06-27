// server.js — Local development server for RAG-Browser
//
// Serves the app with COOP/COEP headers required for SharedArrayBuffer,
// which enables multi-threaded WASM inference via ONNX Runtime Web.
//
// Without these headers, the browser blocks SharedArrayBuffer and the
// WASM backend falls back to single-threaded mode (3-4x slower).
//
// Usage:
//   node server.js          # Starts on port 3000
//   PORT=8080 node server.js # Starts on port 8080
//
// Then open: http://localhost:3000

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PORT = parseInt(process.env.PORT || "3000", 10);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const COVERAGE = process.env.COVERAGE === "1";

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
  // ── COOP/COEP headers for SharedArrayBuffer ──────────────────────
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
  res.setHeader("Cross-Origin-Resource-Policy", "same-origin");

  // Resolve the requested file path
  let filePath = path.join(__dirname, req.url === "/" ? "index.html" : req.url);

  // When COVERAGE=1, redirect /js/* requests to /js-instrumented/*
  if (COVERAGE && req.url.startsWith("/js/")) {
    filePath = path.join(__dirname, "js-instrumented" + req.url.slice(3));
  }
  const ext = path.extname(filePath);
  const mimeType = MIME_TYPES[ext] || "application/octet-stream";

  fs.readFile(filePath, (err, data) => {
    if (err) {
      if (err.code === "ENOENT") {
        // Try serving index.html for SPA-like routing (only for non-file paths)
        if (!ext && !req.url.includes(".")) {
          filePath = path.join(__dirname, "index.html");
          fs.readFile(filePath, (err2, data2) => {
            if (err2) {
              res.writeHead(404, { "Content-Type": "text/plain" });
              res.end("404 Not Found");
              return;
            }
            res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
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
});

server.listen(PORT, () => {
  console.log(`RAG-Browser dev server running at http://localhost:${PORT}`);
  console.log(
    "COOP/COEP headers enabled — SharedArrayBuffer available for multi-threaded WASM",
  );
});
