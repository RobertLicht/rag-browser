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
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

/**
 * Extract only the new text from accumulated text.
 * Used for streaming: TextStreamer's callback_function receives the FULL accumulated text
 * on each token, so we diff against the previous value to get the delta.
 */
export function getNewText(fullText, previousText) {
  return fullText.slice(previousText.length);
}
