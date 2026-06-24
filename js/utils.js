// utils.js — Utility functions (UUID, token estimation, formatting, streaming diff)

/**
 * Generate a unique UUID v4 using the browser's crypto API.
 * Available in all modern browsers (requires secure context / HTTPS or localhost).
 */
export function generateUUID() {
  return crypto.randomUUID();
}

/**
 * Rough token estimation for English text.
 * Uses the heuristic: ~4 characters per token.
 * Not accurate for all languages or tokenizers, but sufficient for chunking bounds.
 */
export function estimateTokens(text) {
  return Math.ceil(text.length / 4);
}

/**
 * Format byte count into human-readable string (e.g. "1.5 MB").
 */
export function formatBytes(bytes) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

/**
 * Extract only the new text from accumulated text.
 * The onToken callback receives the FULL accumulated text after generation
 * completes, so we diff against the previous value to get the delta.
 */
export function getNewText(fullText, previousText) {
  return fullText.slice(previousText.length);
}

// ─── Token Tracking Utilities ───────────────────────────────────────

/**
 * Chat template adds formatting tokens (role markers, separators, special tokens).
 * This multiplier accounts for the overhead the processor.apply_chat_template() adds.
 */
const CHAT_TEMPLATE_OVERHEAD = 1.15;

/**
 * Estimate tokens for an array of messages, accounting for chat template overhead.
 * Each message is { role, content: [{ type: 'text', text: '...' }] } or { role, content: '...' }
 */
export function estimateInputTokens(messages) {
  if (!messages || messages.length === 0) return 0;

  const rawCharCount = messages.reduce((sum, msg) => {
    const text =
      typeof msg.content === "string"
        ? msg.content
        : msg.content?.[0]?.type === "text"
          ? msg.content[0].text
          : "";
    return sum + text.length;
  }, 0);

  return Math.ceil((rawCharCount / 4) * CHAT_TEMPLATE_OVERHEAD);
}

/**
 * Format token count with K/M suffix for display.
 */
export function formatTokens(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

/**
 * Determine warning level based on context window usage percentage.
 * The banner only appears once usage exceeds 75% of the context window.
 *
 * Levels:
 *   ok        — usage ≤ 75% (no banner)
 *   caution   — usage > 75% (gentle suggestion)
 *   warning   — usage > 90% (stronger message)
 *   critical  — usage > 95% (urgent)
 *   exceeded  — remaining ≤ 0 (already full)
 *
 * @param {number} remaining - Remaining tokens in context window
 * @param {number} contextWindow - Total context window size
 * @returns {'ok' | 'caution' | 'warning' | 'critical' | 'exceeded'}
 */
export function getWarningLevel(remaining, contextWindow) {
  if (remaining <= 0) return "exceeded";
  const usage = (contextWindow - remaining) / contextWindow;
  if (usage > 0.95) return "critical";
  if (usage > 0.9) return "warning";
  if (usage > 0.75) return "caution";
  return "ok";
}

// ─── Thinking Tag Utilities ───────────────────────────────────────────

/**
 * Ensure thinking content is properly wrapped in `` tags.
 *
 * When a chat template places the opening `` tag in the prompt
 * (input tokens), the model generates only the closing `` tag.
 * This function detects that case and wraps the pre-close-tag content
 * with the opening tag so that renderer.preprocessThinking() can
 * convert it into a collapsible `<details>` element.
 *
 * @param {string} content - Raw model output
 * @param {boolean} enableThinking - Whether thinking mode is active
 * @returns {string} Content with proper think tags
 */
export function ensureThinkTags(content, enableThinking) {
  if (!enableThinking || !content) return content;
  const openTag = "<" + "think>";
  const closeTag = "<" + "/think>";
  const closeIndex = content.indexOf(closeTag);
  // Only fix if closing tag exists but opening tag is missing
  if (closeIndex !== -1 && !content.startsWith(openTag)) {
    const thinkingContent = content.substring(0, closeIndex).trim();
    const answerContent = content.substring(closeIndex + closeTag.length);
    return openTag + "\n" + thinkingContent + "\n" + closeTag + answerContent;
  }
  return content;
}
