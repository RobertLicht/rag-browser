// embedding.js — Embedding model loader, inference, and disposal

import { pipeline } from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.2.0/+esm';

let extractor = null;

/**
 * Task instruction for query embedding.
 * Qwen3-Embedding uses instruction-aware embeddings:
 * Queries are wrapped with "Instruct: {task}\nQuery:{query}"
 * Documents are embedded WITHOUT instruction wrapper.
 */
const TASK_INSTRUCTION = "Given a web search query, retrieve relevant passages that answer the query";

/**
 * Load the Qwen3-Embedding-0.6B-ONNX model.
 * @param {Object} config - Hardware config with embeddingDtype and device
 */
export async function loadEmbeddingModel(config) {
  extractor = await pipeline("feature-extraction", "onnx-community/Qwen3-Embedding-0.6B-ONNX", {
    dtype: config.embeddingDtype,
    device: config.device,
  });
}

/**
 * Embed a user query with instruction wrapping.
 * Uses last_token pooling + L2 normalization.
 * @param {string} query - The user's search query
 * @returns {number[]} 1024-dimensional normalized embedding vector
 */
export async function embedQuery(query) {
  const instructed = `Instruct: ${TASK_INSTRUCTION}\nQuery:${query}`;
  const output = await extractor(instructed, { pooling: 'last_token', normalize: true });
  return Array.from(output.data);
}

/**
 * Embed multiple document texts WITHOUT instruction wrapping.
 * Uses last_token pooling + L2 normalization.
 * @param {string[]} texts - Array of document texts to embed
 * @returns {number[][]} Array of 1024-dimensional normalized embedding vectors
 */
export async function embedDocuments(texts) {
  const output = await extractor(texts, { pooling: 'last_token', normalize: true });
  return Array.from(output.data);
}

/**
 * Dispose the embedding model and free memory.
 */
export async function unloadEmbeddingModel() {
  if (extractor) {
    await extractor.dispose();
    extractor = null;
  }
}

/**
 * Check if the embedding model is currently loaded.
 */
export function isEmbeddingLoaded() {
  return extractor !== null;
}
