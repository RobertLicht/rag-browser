// state.js — Central application state with observable pattern

import { generateUUID } from './utils.js';

/**
 * Application state schema:
 * - hardware: detected hardware config (from hardware.js)
 * - models: loading status of embedding and LLM models
 * - index: stats about the document index
 * - conversation: array of message objects
 */
let state = {
  hardware: { webgpuAvailable: false, device: 'wasm', dtype: '', deviceMemoryGB: undefined },
  models: { embedding: 'unloaded', llm: 'unloaded' },
  index: { totalChunks: 0, totalDocuments: 0, embeddingDimension: 1024 },
  conversation: [],
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
  subscribers.forEach(fn => fn(state));
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
    contextChunks: contextChunks?.map(c => c.id) || null,
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
  return state.conversation.slice(-maxMessages).map(msg => ({
    role: msg.role,
    content: [{ type: 'text', text: msg.content }],
  }));
}
