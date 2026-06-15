// state.js — Central application state with observable pattern

import {
  generateUUID,
  estimateInputTokens,
  formatTokens,
  getWarningLevel,
} from "./utils.js";

/**
 * Application state schema:
 * - hardware: detected hardware config (from hardware.js)
 * - models: loading status of embedding and LLM models
 * - index: stats about the document index
 * - conversation: array of message objects
 */
/**
 * Default search configuration.
 */
/**
 * Default LLM configuration.
 *
 * Generation parameters follow official Qwen3.5 recommendations from
 * unsloth.ai/docs/models/qwen3.5.
 *
 * Non-thinking (general tasks): temp=0.7, top_p=0.8, top_k=20,
 *   min_p=0.0, presence=1.5, repeat=1.0
 * Thinking (general tasks):    temp=1.0, top_p=0.95, top_k=20,
 *   min_p=0.0, presence=1.5, repeat=1.0
 */
const NON_THINKING_PRESET = {
  temperature: 0.7,
  top_p: 0.8,
  top_k: 20,
  min_p: 0.0,
  presence_penalty: 1.5,
  repetition_penalty: 1.0,
  max_new_tokens: 8192,
};

const THINKING_PRESET = {
  temperature: 1.0,
  top_p: 0.95,
  top_k: 20,
  min_p: 0.0,
  presence_penalty: 1.5,
  repetition_penalty: 1.0,
  max_new_tokens: 8192,
};

/**
 * Default maximum thinking tokens for Qwen3.5's reasoning mode.
 * Controls the token budget allocated to the model's internal reasoning.
 * Defaults to half of the thinking preset's max_new_tokens.
 * Valid range: 1024–8192.
 */
const DEFAULT_MAX_THINKING_TOKENS = Math.floor(
  THINKING_PRESET.max_new_tokens / 2,
);

/**
 * Effective context window size for the browser environment.
 * While Qwen3.5-2B supports 262K tokens natively, WebGPU memory constraints
 * in the browser limit the practical context window to ~32K tokens.
 */
const DEFAULT_CONTEXT_WINDOW = 32768;

export const DEFAULT_LLM_CONFIG = {
  enableThinking: false, // Qwen3.5-2B defaults to non-thinking mode
  maxThinkingTokens: DEFAULT_MAX_THINKING_TOKENS,
  generation: { ...NON_THINKING_PRESET },
};

/**
 * Get the appropriate generation preset for the given thinking mode.
 * @param {boolean} enableThinking
 * @returns {Object} Generation parameters
 */
export function getGenerationPreset(enableThinking) {
  return enableThinking ? { ...THINKING_PRESET } : { ...NON_THINKING_PRESET };
}

/**
 * Default search configuration.
 */
export const DEFAULT_SEARCH_CONFIG = {
  mode: "hybrid", // 'hybrid' | 'vector'
  hybridWeights: {
    // BM25 vs vector balance (only in hybrid mode)
    text: 0.7,
    vector: 0.3,
  },
  thresholds: {
    hybridSimilarity: 0.65, // Minimum combined score
    minVectorSimilarity: 0.55, // Vector quality gate in hybrid mode
    vectorSimilarity: 0.7, // Pure vector threshold
  },
  topN: 5, // Max chunks retrieved per query (1-20)
};

let state = {
  hardware: {
    webgpuAvailable: false,
    device: "wasm",
    dtype: "",
    deviceMemoryGB: undefined,
  },
  models: { embedding: "unloaded", llm: "unloaded" },
  index: { totalChunks: 0, totalDocuments: 0, embeddingDimension: 1024 },
  conversation: [],
  searchConfig: { ...DEFAULT_SEARCH_CONFIG },
  llmConfig: { ...DEFAULT_LLM_CONFIG },
  tokenTracking: {
    contextWindow: DEFAULT_CONTEXT_WINDOW,
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    remainingTokens: DEFAULT_CONTEXT_WINDOW,
    warningLevel: "ok",
  },
};

const subscribers = [];

/**
 * Get a shallow copy of the current state.
 */
export function getState() {
  return { ...state };
}

/**
 * Update state with new values (shallow merge).
 * Notifies all subscribers after update.
 * @param {Object} updates - Partial state object to merge
 */
export function setState(updates) {
  state = { ...state, ...updates };
  subscribers.forEach((fn) => fn(state));
}

/**
 * Subscribe to state changes.
 * @param {Function} fn - Callback receiving full state on every update
 * @returns {Function} Unsubscribe function
 */
export function subscribe(fn) {
  subscribers.push(fn);
  return () => {
    const idx = subscribers.indexOf(fn);
    if (idx !== -1) subscribers.splice(idx, 1);
  };
}

/**
 * Add a message to the conversation history.
 * @param {'user' | 'assistant'} role
 * @param {string} content
 * @param {Array|null} contextChunks - Optional array of chunk references for assistant messages
 */
export function addMessage(role, content, contextChunks = null) {
  const message = {
    id: generateUUID(),
    role,
    content,
    timestamp: Date.now(),
    contextChunks: contextChunks?.map((c) => c.id) || null,
  };
  setState({ conversation: [...state.conversation, message] });
  return message;
}

/**
 * Clear the entire conversation history.
 */
export function clearConversation() {
  setState({ conversation: [] });
}

/**
 * Get the last N messages formatted for the LLM pipeline.
 * Each message is converted to the format: { role, content: [{ type: 'text', text: ... }] }
 * @param {number} maxMessages - Maximum number of messages to include (default 10 = 5 exchanges)
 */
export function getRecentHistory(maxMessages = 10) {
  return state.conversation.slice(-maxMessages).map((msg) => ({
    role: msg.role,
    content: [{ type: "text", text: msg.content }],
  }));
}

/**
 * Update search configuration. Merges partial config into existing state.
 * Nested objects (hybridWeights, thresholds) are deep-merged.
 * @param {Object} updates - Partial search config to merge
 */
export function setSearchConfig(updates) {
  if (updates.hybridWeights !== undefined) {
    state.searchConfig.hybridWeights = {
      ...state.searchConfig.hybridWeights,
      ...updates.hybridWeights,
    };
  }
  if (updates.thresholds !== undefined) {
    state.searchConfig.thresholds = {
      ...state.searchConfig.thresholds,
      ...updates.thresholds,
    };
  }
  for (const key of ["mode", "topN"]) {
    if (updates[key] !== undefined) {
      state.searchConfig[key] = updates[key];
    }
  }
  subscribers.forEach((fn) => fn(state));
}

/**
 * Reset search configuration to defaults.
 */
export function resetSearchConfig() {
  state.searchConfig = { ...DEFAULT_SEARCH_CONFIG };
  subscribers.forEach((fn) => fn(state));
}

/**
 * Update LLM configuration. Merges partial config into existing state.
 * Supports updating individual generation parameters via `generation` key.
 * @param {Object} updates - Partial LLM config to merge
 */
export function setLlmConfig(updates) {
  for (const key of ["enableThinking"]) {
    if (updates[key] !== undefined) {
      state.llmConfig[key] = updates[key];
      // Auto-apply generation preset when thinking mode changes
      state.llmConfig.generation = {
        ...getGenerationPreset(state.llmConfig.enableThinking),
      };
      // Reset maxThinkingTokens to default when enabling thinking mode
      if (state.llmConfig.enableThinking) {
        state.llmConfig.maxThinkingTokens = DEFAULT_MAX_THINKING_TOKENS;
      }
    }
  }
  // Handle direct maxThinkingTokens updates (e.g., from slider)
  if (updates.maxThinkingTokens !== undefined) {
    state.llmConfig.maxThinkingTokens = updates.maxThinkingTokens;
  }
  if (updates.generation !== undefined) {
    state.llmConfig.generation = {
      ...state.llmConfig.generation,
      ...updates.generation,
    };
  }
  subscribers.forEach((fn) => fn(state));
}

/**
 * Reset LLM configuration to defaults.
 */
export function resetLlmConfig() {
  state.llmConfig = { ...DEFAULT_LLM_CONFIG };
  subscribers.forEach((fn) => fn(state));
}

/**
 * Reset only the generation parameters to the preset for the current thinking mode.
 * Preserves the current enableThinking setting.
 */
export function resetGenerationToPreset() {
  state.llmConfig.generation = {
    ...getGenerationPreset(state.llmConfig.enableThinking),
  };
  subscribers.forEach((fn) => fn(state));
}

// ─── Token Tracking ─────────────────────────────────────────────────

export function updateTokenTracking(inputTokens, outputTokens, maxNewTokens) {
  const reserved = maxNewTokens ?? state.llmConfig.generation.max_new_tokens;
  const total = inputTokens + outputTokens;
  const remaining = state.tokenTracking.contextWindow - total;

  state.tokenTracking = {
    ...state.tokenTracking,
    inputTokens,
    outputTokens,
    totalTokens: total,
    remainingTokens: remaining,
    warningLevel: getWarningLevel(remaining, reserved),
  };
  subscribers.forEach((fn) => fn(state));
}

export function getTokenTracking() {
  return { ...state.tokenTracking };
}

export function resetTokenTracking() {
  state.tokenTracking = {
    contextWindow: state.tokenTracking.contextWindow,
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    remainingTokens: state.tokenTracking.contextWindow,
    warningLevel: "ok",
  };
  subscribers.forEach((fn) => fn(state));
}

export function setContextWindow(windowSize) {
  state.tokenTracking.contextWindow = windowSize;
  state.tokenTracking.remainingTokens =
    windowSize - state.tokenTracking.totalTokens;
  subscribers.forEach((fn) => fn(state));
}
