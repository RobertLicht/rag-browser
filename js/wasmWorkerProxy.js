// wasmWorkerProxy.js — Promise-based proxy that wraps wasmWorker.js
//
// Exposes the same API as embedding.js + llm.js so callers can use
// a single interface regardless of whether inference runs on the
// main thread (WebGPU) or in a Web Worker (WASM).

import { getState } from "./state.js";

const TASK_INSTRUCTION =
  "Given a web search query, retrieve relevant passages that answer the query";

const CONTEXT_WINDOW_WASM = 4096;

// ── Worker lifecycle ──────────────────────────────────────────────────

let worker = null;
let messageCounter = 0;

// Pending promises keyed by message ID.  The value is { resolve, reject, timeout }.
const pending = new Map();

/**
 * Start the worker (lazy, called on first use).
 * @returns {Worker}
 */
function getWorker() {
  if (!worker) {
    worker = new Worker(new URL("./wasmWorker.js", import.meta.url), {
      type: "module",
    });
    worker.onmessage = (e) => {
      const { id, type, payload, tag, info } = e.data;

      // Progress messages are not tied to a pending request
      if (type === "progress") {
        const handler = progressHandlers.get(tag);
        if (handler) handler(info);
        return;
      }

      const pendingMsg = pending.get(id);
      if (!pendingMsg) return;

      clearTimeout(pendingMsg.timeout);
      pending.delete(id);

      if (type === "result") {
        pendingMsg.resolve(payload);
      } else if (type === "error") {
        pendingMsg.reject(new Error(payload.message));
      }
    };

    worker.onerror = (error) => {
      // Reject all pending operations when the worker crashes
      for (const [id, p] of pending) {
        clearTimeout(p.timeout);
        p.reject(new Error(`Worker error: ${error.message}`));
      }
      pending.clear();
    };
  }
  return worker;
}

/**
 * Send a message to the worker and return a Promise that resolves with the result.
 * @param {string} type - Message type
 * @param {Object} payload - Message payload
 * @param {number} [timeoutMs] - Timeout in milliseconds (default 120s)
 * @returns {Promise<Object>}
 */
function sendMessage(type, payload, timeoutMs = 120_000) {
  const w = getWorker();
  const id = ++messageCounter;
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      pending.delete(id);
      reject(new Error(`Worker timeout (${type}) after ${timeoutMs / 1000}s`));
    }, timeoutMs);
    pending.set(id, { resolve, reject, timeout });
    w.postMessage({ id, type, payload });
  });
}

// ── Progress callback registry ────────────────────────────────────────

/** Map<tag: 'embedding' | 'llm', callback> */
const progressHandlers = new Map();

/**
 * Register a progress callback for a specific model tag.
 * @param {'embedding' | 'llm'} tag
 * @param {Function} callback
 */
function setProgressHandler(tag, callback) {
  if (callback) {
    progressHandlers.set(tag, callback);
  } else {
    progressHandlers.delete(tag);
  }
}

// ── Module-level state ────────────────────────────────────────────────

let _embeddingReady = false;
let _llmReady = false;

// ── Public API (matches embedding.js + llm.js) ────────────────────────

/**
 * Load the embedding model in the worker.
 * @param {Object} config - Hardware config
 * @param {Function} [onProgress] - Progress callback (forwarded from worker)
 */
export async function loadEmbeddingModel(config, onProgress) {
  setProgressHandler("embedding", onProgress);
  try {
    await sendMessage("load-embedding", {
      dtype: config.embeddingDtype,
      device: config.device,
      progress_callback: true,
    });
    _embeddingReady = true;
  } finally {
    setProgressHandler("embedding", null);
  }
}

/**
 * Embed a single query text (with instruction wrapping).
 * @param {string} query
 * @returns {Promise<number[]>} 1024-dim embedding
 */
export async function embedQuery(query) {
  const instructed = `Instruct: ${TASK_INSTRUCTION}\nQuery:${query}`;
  const result = await sendMessage("embed-query", {
    text: instructed,
    taskInstruction: null,
  });
  return result.data;
}

/**
 * Embed multiple document texts (without instruction wrapping).
 * @param {string[]} texts
 * @returns {Promise<number[]>} Flat array of embedding data
 */
export async function embedDocuments(texts) {
  const result = await sendMessage("embed-documents", { texts });
  return result.data;
}

/**
 * Convert flat batch embedding data into individual vectors.
 * Pure CPU operation — no worker message needed.
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
 * Dispose the embedding model.
 */
export async function unloadEmbeddingModel() {
  await sendMessage("unload-embedding", {});
  _embeddingReady = false;
}

/**
 * Check if the embedding model is loaded.
 */
export function isEmbeddingLoaded() {
  return _embeddingReady;
}

// ── LLM ───────────────────────────────────────────────────────────────

/**
 * Load the LLM in the worker.
 * @param {Object} config - Hardware config
 * @param {Function} [onProgress] - Progress callback
 */
export async function loadLLM(config, onProgress) {
  setProgressHandler("llm", onProgress);
  try {
    await sendMessage("load-llm", {
      modelId: config.llmModelId,
      llmDtype: config.llmDtype,
      dtype: config.llmDtype,
      device: config.device,
      progress_callback: true,
    });
    _llmReady = true;
  } finally {
    setProgressHandler("llm", null);
  }
}

/**
 * Generate a response from the LLM.
 *
 * Messages are in nested content format:
 *   [{ role, content: [{ type: 'text', text: '...' }] }, ...]
 *
 * @param {Array} messages
 * @param {Function} onToken - Callback with full text (called once)
 * @param {Function} onComplete - Callback with { text, outputTokenCount }
 * @param {Function} [onPhase] - Phase updates
 * @returns {Promise<{ text: string, outputTokenCount: number }>}
 */
export async function generateResponse(messages, onToken, onComplete, onPhase) {
  if (onPhase) onPhase("generating");

  // Flatten nested content for the worker
  const flatMessages = messages.map((msg) => ({
    role: msg.role,
    content:
      typeof msg.content === "string"
        ? msg.content
        : msg.content?.[0]?.type === "text"
          ? msg.content[0].text
          : "",
  }));

  // Read generation params from app state
  const { llmConfig } = getState();

  const result = await sendMessage("generate", {
    messages: flatMessages,
    generation: llmConfig.generation,
  });

  if (onToken) onToken(result.text);
  if (onComplete)
    onComplete(result.text, { outputTokenCount: result.outputTokenCount });

  return { text: result.text, outputTokenCount: result.outputTokenCount };
}

/**
 * Stop the current generation.
 */
export async function stopGeneration() {
  try {
    await sendMessage("stop-generation", {}, 5000);
  } catch {
    // Ignore — stop is best-effort
  }
}

/**
 * Dispose the LLM.
 */
export async function unloadLLM() {
  await sendMessage("unload-llm", {});
  _llmReady = false;
}

/**
 * Check if the LLM is loaded.
 */
export function isLLMLoaded() {
  return _llmReady;
}

/**
 * Context window for the WASM model (Qwen3-0.6B: 4K).
 */
export function getContextWindow() {
  return CONTEXT_WINDOW_WASM;
}

/**
 * WASM model does not support thinking mode.
 */
export function supportsThinking() {
  return false;
}
