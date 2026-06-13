// embedding.js — Embedding model loader, inference, and disposal

import { pipeline } from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.2.0/+esm";

let extractor = null;

/**
 * Task instruction for query embedding.
 * Qwen3-Embedding uses instruction-aware embeddings:
 * Queries are wrapped with "Instruct: {task}\nQuery:{query}"
 * Documents are embedded WITHOUT instruction wrapper.
 */
const TASK_INSTRUCTION =
  "Given a web search query, retrieve relevant passages that answer the query";

/**
 * Load the Qwen3-Embedding-0.6B-ONNX model.
 * @param {Object} config - Hardware config with embeddingDtype and device
 * @param {Function} [onProgress] - Optional progress callback from transformers.js
 */
export async function loadEmbeddingModel(config, onProgress) {
  extractor = await pipeline(
    "feature-extraction",
    "onnx-community/Qwen3-Embedding-0.6B-ONNX",
    {
      dtype: config.embeddingDtype,
      device: config.device,
      progress_callback: onProgress,
    },
  );
}

/**
 * Embed a user query with instruction wrapping.
 * Uses last_token pooling + L2 normalization.
 * @param {string} query - The user's search query
 * @returns {number[]} 1024-dimensional normalized embedding vector
 */
export async function embedQuery(query) {
  const instructed = `Instruct: ${TASK_INSTRUCTION}\nQuery:${query}`;
  const output = await extractor(instructed, {
    pooling: "last_token",
    normalize: true,
  });
  return Array.from(output.data);
}

/**
 * Embed multiple document texts WITHOUT instruction wrapping.
 * Uses last_token pooling + L2 normalization.
 * @param {string[]} texts - Array of document texts to embed
 * @returns {number[]} Flat array of embedding data (batch_size * hidden_dim)
 */
export async function embedDocuments(texts) {
  const output = await extractor(texts, {
    pooling: "last_token",
    normalize: true,
  });
  return Array.from(output.data);
}

/**
 * Convert flat batch embedding data into an array of individual vectors.
 * The raw output from embedDocuments() is a flat array of shape
 * [batch_size * hidden_dim]. This reshapes it into [batch_size][hidden_dim].
 * @param {number[]} flatData - Flat array from embedDocuments()
 * @param {number} batchSize - Number of texts in the batch
 * @returns {number[][]} Array of individual embedding vectors
 */
export function getEmbeddingArrays(flatData, batchSize) {
  const dim = flatData.length / batchSize;
  const arrays = [];
  for (let i = 0; i < batchSize; i++) {
    const start = i * dim;
    arrays.push(flatData.slice(start, start + dim));
  }
  return arrays;
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
