// fileParser.js — Unified file parser for RAG document ingestion

/**
 * All supported file extensions for document ingestion.
 */
export const SUPPORTED_EXTENSIONS = [
  // Plain text
  ".txt",
  // Markdown
  ".md",
  // Spreadsheet
  ".csv",
  ".xls",
  ".xlsx",
  // Word (modern only — binary .doc is unsupported)
  ".docx",
  // PowerPoint (modern only — binary .ppt is unsupported)
  ".pptx",
  // OpenDocument formats
  ".odt",
  ".ods",
  ".odp",
  // PDF
  ".pdf",
];

/**
 * Extensions that require the officeParser library (non-plain-text formats).
 * .txt and .md are handled natively without any external dependency.
 */
const OFFICE_EXTENSIONS = [
  ".csv",
  ".xls",
  ".xlsx",
  ".docx",
  ".pptx",
  ".odt",
  ".ods",
  ".odp",
];

/**
 * Extensions that require the PDF.js library for parsing.
 */
const PDF_EXTENSIONS = [".pdf"];

/**
 * CDN URL for the officeParser browser IIFE bundle.
 * Pinned to version 7.2.0 for stability.
 */
const OFFICE_PARSER_CDN =
  "https://cdn.jsdelivr.net/npm/officeparser@7.2.0/dist/officeparser.browser.iife.js";

// ─── State ────────────────────────────────────────────────────────────────

/** @type {Promise<boolean>|null} — Resolves when officeParser is loaded */
let officeParserLoadPromise = null;

/** @type {Promise<object>|null} — Resolves when PDF.js is loaded */
let pdfjsLoadPromise = null;

/**
 * PDF.js version pinned for stability. Uses jsDelivr CDN.
 */
const PDFJS_VERSION = "4.9.155";
const PDFJS_CDN_BASE = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/build`;

/**
 * Load officeParser from CDN as an IIFE script. Returns true when loaded.
 * Lazy-loaded on first demand; subsequent calls reuse the same promise.
 *
 * @returns {Promise<boolean>}
 */
export async function loadOfficeParser() {
  if (officeParserLoadPromise !== null) {
    return officeParserLoadPromise;
  }

  officeParserLoadPromise = (async () => {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = OFFICE_PARSER_CDN;
      script.onload = () => resolve(true);
      script.onerror = () =>
        reject(
          new Error(
            `Failed to load officeParser from CDN (${OFFICE_PARSER_CDN})`,
          ),
        );
      document.head.appendChild(script);
    });
  })();

  return officeParserLoadPromise;
}

// ─── Format Checks ────────────────────────────────────────────────────────

/**
 * Check if a filename has a supported extension.
 *
 * @param {string} filename
 * @returns {boolean}
 */
export function isSupportedFormat(filename) {
  const ext = getExtension(filename);
  return SUPPORTED_EXTENSIONS.includes(ext);
}

/**
 * Check if a file requires the officeParser library (non-plain-text).
 *
 * @param {string} filename
 * @returns {boolean}
 */
export function needsOfficeParser(filename) {
  const ext = getExtension(filename);
  return OFFICE_EXTENSIONS.includes(ext);
}

/**
 * Check if a file requires the PDF.js library.
 *
 * @param {string} filename
 * @returns {boolean}
 */
export function needsPdfJs(filename) {
  const ext = getExtension(filename);
  return PDF_EXTENSIONS.includes(ext);
}

/**
 * Get the file extension including the dot (e.g. ".xlsx").
 *
 * @param {string} filename
 * @returns {string}
 */
function getExtension(filename) {
  const lastDot = filename.lastIndexOf(".");
  return lastDot === -1 ? "" : filename.slice(lastDot).toLowerCase();
}

// ─── Parsing ──────────────────────────────────────────────────────────────

/**
 * Parse a file and extract its plain text content.
 *
 * For .txt and .md files: reads directly with File.text(), optionally
 * stripping Markdown syntax for .md files.
 * For .pdf files: uses the PDF.js library.
 * For all other supported formats: uses the officeParser library.
 *
 * @param {File} file
 * @returns {Promise<string>} Plain text content of the file
 * @throws {Error} If the file format is unsupported or parsing fails
 */
export async function parseFile(file) {
  const ext = getExtension(file.name);

  // Plain text — no parsing needed
  if (ext === ".txt") {
    return file.text();
  }

  // Markdown — read as text and strip syntax for cleaner embeddings
  if (ext === ".md") {
    const raw = await file.text();
    return stripMarkdownSyntax(raw);
  }

  // PDF — use PDF.js
  if (PDF_EXTENSIONS.includes(ext)) {
    const buffer = await file.arrayBuffer();
    return parsePdf(buffer);
  }

  // Everything else — use officeParser
  if (OFFICE_EXTENSIONS.includes(ext)) {
    await loadOfficeParser();
    const buffer = await file.arrayBuffer();
    // Pass fileType hint so officeParser can parse formats without magic bytes (csv)
    return parseWithOfficeParser(buffer, ext.slice(1));
  }

  throw new Error(
    `Unsupported file format: "${ext}". Supported formats: ${SUPPORTED_EXTENSIONS.join(", ")}`,
  );
}

/**
 * Strip Markdown syntax from a text, converting it to plain text.
 * Handles: headings, bold/italic, links, images, code blocks, lists,
 * blockquotes, horizontal rules, and HTML tags.
 *
 * @param {string} text
 * @returns {string}
 */
function stripMarkdownSyntax(text) {
  return (
    text
      // Remove HTML tags (common in Markdown)
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(/<[^>]+>/g, "")

      // Remove fenced code blocks (``` ... ```)
      .replace(/```[\s\S]*?```/g, "")

      // Remove inline code (`code`)
      .replace(/`[^`]+`/g, "")

      // Remove images (![alt](url))
      .replace(/!\[[^\]]*\]\([^)]*\)/g, "")

      // Remove links — keep only the link text [text](url) → text
      .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")

      // Remove headings (# Heading)
      .replace(/^#{1,6}\s+/gm, "")

      // Remove horizontal rules (---, ***, ___)
      .replace(/^[-*_]{3,}\s*$/gm, "")

      // Remove blockquote markers (>)
      .replace(/^>\s+/gm, "")

      // Remove list markers (* -, +)
      .replace(/^[\s]*[-*+]\s+/gm, "")

      // Remove ordered list markers (1. 2. etc.)
      .replace(/^\d+\.\s+/gm, "")

      // Remove bold (**text** or __text__)
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/__([^_]+)__/g, "$1")

      // Remove italic (*text* or _text_)
      .replace(/\*([^*]+)\*/g, "$1")
      .replace(/_([^_]+)_/g, "$1")

      // Remove strikethrough (~~text~~)
      .replace(/~~([^~]+)~~/g, "$1")

      // Clean up extra blank lines (collapse 3+ newlines to 2)
      .replace(/\n{3,}/g, "\n\n")
  );
}

/**
 * Parse an ArrayBuffer using the globally-loaded officeParser library.
 *
 * @param {ArrayBuffer} buffer
 * @param {string} [fileType] — Explicit file type hint (e.g. "csv") for formats
 *                              without magic bytes; optional for binary formats.
 * @returns {Promise<string>}
 * @throws {Error} If officeParser is not loaded or parsing fails
 */
async function parseWithOfficeParser(buffer, fileType) {
  if (typeof officeParser === "undefined") {
    throw new Error(
      "officeParser library failed to load. Check your internet connection.",
    );
  }

  const config = fileType ? { fileType } : {};
  const ast = await officeParser.parseOffice(new Uint8Array(buffer), config);
  return ast.toText();
}

// ─── PDF.js Integration ───────────────────────────────────────────────────

/**
 * Load PDF.js from CDN as an ES module. Returns the pdfjsLib namespace.
 * Lazy-loaded on first demand; subsequent calls reuse the same promise.
 *
 * @returns {Promise<object>} The pdfjsLib module namespace
 */
async function loadPdfJs() {
  if (pdfjsLoadPromise !== null) {
    return pdfjsLoadPromise;
  }

  pdfjsLoadPromise = (async () => {
    try {
      const pdfjsLib = await import(
        /* webpackIgnore: true */ `${PDFJS_CDN_BASE}/pdf.min.mjs`
      );
      // Configure the worker from the same CDN version
      pdfjsLib.GlobalWorkerOptions.workerSrc = `${PDFJS_CDN_BASE}/pdf.worker.min.mjs`;
      return pdfjsLib;
    } catch (error) {
      pdfjsLoadPromise = null; // Reset so we can retry
      throw new Error(
        `Failed to load PDF.js from CDN (${PDFJS_CDN_BASE}): ${error.message}`,
      );
    }
  })();

  return pdfjsLoadPromise;
}

/**
 * Parse a PDF ArrayBuffer and extract its plain text content.
 * Uses PDF.js to iterate each page and extract text items, joining them
 * with newlines for readable output.
 *
 * @param {ArrayBuffer} buffer - Raw PDF file data
 * @returns {Promise<string>} Plain text content of the PDF
 * @throws {Error} If PDF.js fails to load or parsing fails
 */
async function parsePdf(buffer) {
  const pdfjsLib = await loadPdfJs();

  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(buffer),
  });
  const pdf = await loadingTask.promise;

  const pagesText = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    // Extract text strings and join them for this page
    const pageText = textContent.items.map((item) => item.str).join("");
    if (pageText.trim()) {
      pagesText.push(pageText);
    }
  }

  // Join pages with double newline for readable separation
  return pagesText.join("\n\n");
}
