// inference.js — Unified inference facade
//
// Abstracts the WASM (Web Worker) vs. WebGPU (main thread) branching.
// All consumers import from this single module; the facade routes calls
// to the correct backend based on the current hardware.device setting.
//
// When device === 'wasm'   → delegates to wasmWorkerProxy (Web Worker)
// When device === 'webgpu' → delegates to embedding.js + llm.js (main thread)

import { getState } from "./state.js";

// ── Lazy-loaded backends ──────────────────────────────────────────────
// Each backend is loaded only when first needed for its device type.

let _webgpuEmbedding = null;
let _webgpuLlm = null;
let _wasmProxy = null;

async function getWebgpuEmbedding() {
  if (!_webgpuEmbedding) {
    _webgpuEmbedding = await import("./embedding.js");
  }
  return _webgpuEmbedding;
}

async function getWebgpuLlm() {
  if (!_webgpuLlm) {
    _webgpuLlm = await import("./llm.js");
  }
  return _webgpuLlm;
}

async function getWasmProxy() {
  if (!_wasmProxy) {
    _wasmProxy = await import("./wasmWorkerProxy.js");
  }
  return _wasmProxy;
}

// ── Facade-level state tracking ───────────────────────────────────────
// Because `isEmbeddingLoaded()` and `isLLMLoaded()` are synchronous and
// backends may not be loaded yet, we track readiness at the facade level.
// All load/unload operations update this state.

let _embeddingReady = false;
let _llmReady = false;

/** Return true when the current hardware config uses WASM. */
function isWasm() {
  return getState().hardware.device === "wasm";
}

// ── Embedding API ─────────────────────────────────────────────────────

/**
 * Load the embedding model. Routes to Web Worker (WASM) or main thread (WebGPU).
 * @param {Object} config - Hardware config with embeddingDtype and device
 * @param {Function} [onProgress] - Optional progress callback
 */
export async function loadEmbeddingModel(config, onProgress) {
  _embeddingReady = false;
  try {
    if (isWasm()) {
      const mod = await getWasmProxy();
      await mod.loadEmbeddingModel(config, onProgress);
    } else {
      const mod = await getWebgpuEmbedding();
      await mod.loadEmbeddingModel(config, onProgress);
    }
    _embeddingReady = true;
  } catch (error) {
    _embeddingReady = false;
    throw error;
  }
}

/**
 * Embed a single user query with instruction wrapping.
 * @param {string} query
 * @returns {Promise<number[]>} 1024-dim embedding vector
 */
export async function embedQuery(query) {
  const mod = isWasm() ? await getWasmProxy() : await getWebgpuEmbedding();
  return mod.embedQuery(query);
}

/**
 * Embed multiple document texts (without instruction wrapping).
 * @param {string[]} texts
 * @returns {Promise<number[]>} Flat array of embedding data
 */
export async function embedDocuments(texts) {
  const mod = isWasm() ? await getWasmProxy() : await getWebgpuEmbedding();
  return mod.embedDocuments(texts);
}

/**
 * Convert flat batch embedding data into individual vectors.
 * Pure CPU operation — no backend delegation needed.
 * @param {number[]} flatData
 * @param {number} batchSize
 * @returns {number[][]}
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
  if (_embeddingReady) {
    if (isWasm()) {
      const mod = await getWasmProxy();
      await mod.unloadEmbeddingModel();
    } else {
      const mod = await getWebgpuEmbedding();
      await mod.unloadEmbeddingModel();
    }
  }
  _embeddingReady = false;
}

/**
 * Check if the embedding model is currently loaded.
 */
export function isEmbeddingLoaded() {
  return _embeddingReady;
}

// ── LLM API ───────────────────────────────────────────────────────────

/**
 * Load the LLM. Routes to Web Worker (WASM) or main thread (WebGPU).
 * @param {Object} config - Hardware config with llmModelId, llmDtype and device
 * @param {Function} [onProgress] - Optional progress callback
 */
export async function loadLLM(config, onProgress) {
  _llmReady = false;
  try {
    if (isWasm()) {
      const mod = await getWasmProxy();
      await mod.loadLLM(config, onProgress);
    } else {
      const mod = await getWebgpuLlm();
      await mod.loadLLM(config, onProgress);
    }
    _llmReady = true;
  } catch (error) {
    _llmReady = false;
    throw error;
  }
}

/**
 * Generate a response from the LLM.
 * @param {Array} messages - Conversation messages
 * @param {Function} onToken - Streaming callback
 * @param {Function} onComplete - Completion callback
 * @param {Function} [onPhase] - Phase update callback
 * @returns {Promise<{text: string, outputTokenCount: number}>}
 */
export async function generateResponse(messages, onToken, onComplete, onPhase) {
  const mod = isWasm() ? await getWasmProxy() : await getWebgpuLlm();
  return mod.generateResponse(messages, onToken, onComplete, onPhase);
}

/**
 * Stop the current generation (if one is in progress).
 */
export function stopGeneration() {
  if (isWasm()) {
    // WASM proxy stop is async (message to worker) — fire and forget
    if (_wasmProxy) {
      _wasmProxy.stopGeneration().catch(() => {});
    }
  } else {
    // WebGPU stop is synchronous
    if (_webgpuLlm) {
      _webgpuLlm.stopGeneration();
    }
  }
}

/**
 * Dispose the LLM model and free memory.
 */
export async function unloadLLM() {
  if (_llmReady) {
    if (isWasm()) {
      const mod = await getWasmProxy();
      await mod.unloadLLM();
    } else {
      const mod = await getWebgpuLlm();
      await mod.unloadLLM();
    }
  }
  _llmReady = false;
}

/**
 * Check if the LLM model is currently loaded.
 */
export function isLLMLoaded() {
  return _llmReady;
}

/**
 * Return the context window for the currently loaded model.
 */
export function getContextWindow() {
  if (_webgpuLlm) return _webgpuLlm.getContextWindow();
  if (_wasmProxy) return _wasmProxy.getContextWindow();
  // Fallback defaults before any model is loaded
  return isWasm() ? 4096 : 32768;
}

/**
 * Check if the currently loaded model supports thinking mode.
 * Both WebGPU (Qwen3.5) and WASM (Qwen3-0.6B) support thinking.
 * WebGPU uses chat template options; WASM uses /think and /no_think suffixes.
 */
export function supportsThinking() {
  if (_webgpuLlm) return _webgpuLlm.supportsThinking();
  if (_wasmProxy) return _wasmProxy.supportsThinking();
  // Default: both models support thinking until proven otherwise
  return true;
}
