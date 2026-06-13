// chunker.js — Paragraph-aware text chunking with sentence-level fallback

import { generateUUID } from './utils.js';

/**
 * Split text into semantically-aware chunks with overlap.
 *
 * Strategy:
 * 1. Split by paragraphs (double newlines) — preserves semantic boundaries
 * 2. Merge small paragraphs until chunk limit is reached
 * 3. For oversized paragraphs, fall back to sentence-level splitting
 *
 * This works well with last_token pooling because the last token of a coherent
 * paragraph captures better semantic meaning than an arbitrary character split.
 *
 * @param {string} text - The full document text
 * @param {Object} options
 * @param {number} options.maxTokens - Max tokens per chunk (default 512)
 * @param {number} options.overlapPercent - Overlap percentage (default 12%)
 * @param {string} options.sourceFile - Source filename for metadata
 * @returns {Array} Array of chunk objects with id, content, and metadata
 */
export function chunkText(text, options = {}) {
  const {
    maxTokens = 512,
    overlapPercent = 12,
    sourceFile = 'unknown',
  } = options;

  const maxChars = maxTokens * 4; // ~4 chars per token heuristic
  const overlapChars = Math.floor(maxChars * overlapPercent / 100);

  // Strategy 1: Split by paragraphs (double newlines)
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0);
  const chunks = [];
  let currentChunk = '';
  let charOffset = 0;

  for (const paragraph of paragraphs) {
    const trimmed = paragraph.trim();

    if (trimmed.length <= maxChars) {
      // Paragraph fits in a chunk
      if (currentChunk && (currentChunk.length + trimmed.length) <= maxChars) {
        currentChunk += '\n\n' + trimmed;
      } else {
        // Save current chunk and start new one
        if (currentChunk.trim()) {
          chunks.push({
            content: currentChunk.trim(),
            charOffset: charOffset,
            charLength: currentChunk.trim().length,
          });
        }
        currentChunk = trimmed;
        charOffset += currentChunk.length + 2;
      }
    } else {
      // Paragraph too long — split by sentences
      if (currentChunk.trim()) {
        chunks.push({
          content: currentChunk.trim(),
          charOffset: charOffset,
          charLength: currentChunk.trim().length,
        });
      }

      const sentenceChunks = splitBySentences(trimmed, maxChars, overlapChars);
      for (const sc of sentenceChunks) {
        chunks.push({
          ...sc,
          charOffset: charOffset + sc.charOffset,
        });
      }
      charOffset += trimmed.length + 2;
      currentChunk = '';
    }
  }

  // Don't forget the last chunk
  if (currentChunk.trim()) {
    chunks.push({
      content: currentChunk.trim(),
      charOffset: charOffset,
      charLength: currentChunk.trim().length,
    });
  }

  // Add metadata to each chunk
  return chunks.map((chunk, index) => ({
    id: generateUUID(),
    content: chunk.content,
    metadata: {
      sourceFile,
      chunkIndex: index,
      charOffset: chunk.charOffset,
      charLength: chunk.charLength,
    },
  }));
}

/**
 * Split a long text block by sentence boundaries with overlap.
 * @param {string} text - The text to split
 * @param {number} maxChars - Max characters per chunk
 * @param {number} overlapChars - Characters of overlap between chunks
 * @returns {Array} Array of { content, charOffset } objects
 */
function splitBySentences(text, maxChars, overlapChars) {
  // Split by sentence boundaries (.!? followed by space or end)
  const sentences = text.match(/[^.!?]+[.!?]+[\s]*/g) || [text];
  const chunks = [];
  let current = '';

  for (const sentence of sentences) {
    if (current.length + sentence.length <= maxChars) {
      current += sentence;
    } else {
      if (current) {
        chunks.push({ content: current.trim(), charOffset: 0 });
      }
      // Start new chunk with overlap from previous
      const overlap = current.slice(-overlapChars);
      current = overlap + sentence;
    }
  }

  if (current.trim()) {
    chunks.push({ content: current.trim(), charOffset: 0 });
  }

  return chunks;
}
