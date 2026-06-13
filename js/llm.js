// llm.js — LLM model loader, generation with streaming, and disposal

import { pipeline, TextStreamer, InterruptableStoppingCriteria } from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.2.0/+esm';

let generator = null;
let currentStoppingCriteria = null;

/**
 * Qwen3.5-2B ONNX model.
 * Using the huggingworld export for optimal WebGPU performance.
 */
const MODEL_ID = "huggingworld/Qwen3.5-2B-ONNX";

/**
 * Load the LLM model via text-generation pipeline.
 * The pipeline handles tokenization, chat templates, and generation automatically.
 * @param {Object} config - Hardware config with llmDtype and device
 */
export async function loadLLM(config) {
  generator = await pipeline("text-generation", MODEL_ID, {
    dtype: config.llmDtype,
    device: config.device,
  });
}

/**
 * Generate a streaming response from the LLM.
 *
 * The TextStreamer's callback_function receives the FULL accumulated text
 * on each new token, NOT just the delta.
 *
 * @param {Array} messages - Conversation messages in format:
 *   [{ role: 'system', content: [{ type: 'text', text: '...' }] }, ...]
 * @param {Function} onToken - Callback receiving full accumulated text on each token
 * @param {Function} onComplete - Callback receiving final full response text
 * @returns {Promise<string>} The full generated response text
 */
export async function generateResponse(messages, onToken, onComplete) {
  // Create interruptible stopping criteria for stop-generation support
  currentStoppingCriteria = new InterruptableStoppingCriteria();

  // TextStreamer streams decoded text as tokens are generated.
  // callback_function receives the accumulated decoded text (not individual tokens).
  const streamer = new TextStreamer(generator.tokenizer, {
    skip_prompt: true,
    skip_special_tokens: true,
    callback_function: (text) => {
      if (onToken) onToken(text);
    },
  });

  // Pipeline handles chat template, tokenization, and generation
  const result = await generator(messages, {
    max_new_tokens: 512,
    do_sample: false,
    streamer,
    stopping_criteria: [currentStoppingCriteria],
  });

  const fullText = result[0].generated_text;
  if (onComplete) onComplete(fullText);

  currentStoppingCriteria = null;
  return fullText;
}

/**
 * Stop the current generation (if one is in progress).
 * Uses InterruptableStoppingCriteria.interrupt() which stops at the next checkpoint.
 */
export function stopGeneration() {
  if (currentStoppingCriteria) {
    currentStoppingCriteria.interrupt();
  }
}

/**
 * Dispose the LLM model and free memory.
 */
export async function unloadLLM() {
  if (generator) {
    await generator.dispose();
    generator = null;
  }
}

/**
 * Check if the LLM model is currently loaded.
 */
export function isLLMLoaded() {
  return generator !== null;
}
