// renderer.js - Markdown and LaTeX rendering for chat messages

import { marked } from "https://cdn.jsdelivr.net/npm/marked/lib/marked.esm.js";
import renderMathInElement from "https://cdn.jsdelivr.net/npm/katex@0.17.0/dist/contrib/auto-render.mjs";

// Configure marked for chat output
marked.setOptions({
  gfm: true,
  breaks: true,
});

// Configure link renderer to open in new tab
const renderer = new marked.Renderer();
renderer.link = function (href, title, text) {
  const hrefAttr = href ? href.replace(/^javascript:/gi, "") : "";
  let html = '<a href="' + hrefAttr + '" target="_blank" rel="noopener noreferrer"';
  if (title) html += ' title="' + title + '"';
  html += '">' + text + "</a>";
  return html;
};

/**
 * Pre-process raw model output to handle think tags before markdown parsing.
 * Collapses model "thinking" blocks into expandable details elements.
 */
function preprocessThinking(content) {
  if (!content) return "";

  // Build regex dynamically to avoid tag issues
  var openTag = "<" + "think>";
  var closeTag = "<" + "/think>";
  var regex = new RegExp(openTag + "([\\s\\S]*?)" + closeTag, "gi");

  return content.replace(
    regex,
    function(_match, thought) {
      return '<details class="think-block"><summary>Thinking Process</summary><div class="think-content">' + thought.trim() + '</div></details>';
    }
  );
}

/**
 * Render markdown content to HTML string.
 * @param {string} content - Raw markdown text
 * @returns {string} Rendered HTML
 */
export function renderMarkdown(content) {
  if (!content) return "";
  const preprocessed = preprocessThinking(content);
  return marked.parse(preprocessed);
}

/**
 * Render LaTeX in an already-rendered DOM element using KaTeX auto-render.
 * Scans for $$...$$ (display math) and $...$ (inline math).
 * Skips <pre>, <code>, <script> tags to avoid breaking code blocks.
 * @param {HTMLElement} element - DOM element containing rendered markdown
 */
export function renderLaTeX(element) {
  if (!element || typeof renderMathInElement !== "function") return;

  renderMathInElement(element, {
    delimiters: [
      { left: "$$", right: "$$", display: true },
      { left: "$", right: "$", display: false },
    ],
    throwOnError: false,
    ignoreClass: "katex-ignore",
  });
}
