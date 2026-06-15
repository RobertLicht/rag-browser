// llm.js — LLM model loader, generation (batch decode), and disposal

import {
  AutoProcessor,
  Qwen3_5ForConditionalGeneration,
  InterruptableStoppingCriteria,
} from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.2.0/+esm";

import { getState } from "./state.js";

let processor = null;
let model = null;
let currentStoppingCriteria = null;

/**
 * Qwen3.5-2B ONNX model (multi-modal).
 * Uses huggingworld export for optimal WebGPU performance.
 *
 * IMPORTANT: The pipeline() API does NOT correctly handle Qwen3_5ForConditionalGeneration
 * (multi-modal architecture). This module uses the low-level processor + model API
 * directly to ensure proper tokenization, chat templating, and generation.
 *
 * Reference: data/minimal-qwen3.5-2b.html
 */
const MODEL_ID = "huggingworld/Qwen3.5-2B-ONNX";

/**
 * Load the LLM processor and model.
 *
 * Qwen3.5 requires AutoProcessor (not AutoTokenizer) because it's a multi-modal
 * model. The processor handles chat templating and tokenization for the model.
 *
 * @param {Object} config - Hardware config with llmDtype and device
 * @param {Function} [onProgress] - Optional progress callback from transformers.js
 */
export async function loadLLM(config, onProgress) {
  processor = await AutoProcessor.from_pretrained(MODEL_ID);
  model = await Qwen3_5ForConditionalGeneration.from_pretrained(MODEL_ID, {
    dtype: config.llmDtype,
    device: config.device,
    progress_callback: onProgress,
  });
}

/**
 * Generate a response from the LLM.
 *
 * Messages are expected in the format:
 *   [{ role: 'system', content: [{ type: 'text', text: '...' }] }, ...]
 *
 * Internally, messages are transformed to the flat format expected by
 * processor.apply_chat_template(): [{ role: 'system', content: '...' }]
 *
 * NOTE: We do NOT use TextStreamer for generation. TextStreamer performs
 * incremental token-by-token decoding, which corrupts output with Qwen3.5's
 * BPE tokenizer. The BPE merge rules are not applied correctly during
 * incremental decoding, producing garbled/fragmented text. Instead, we
 * collect all generated token IDs and decode them in one batch after
 * generation completes. This matches the official Python reference code:
 *   processor.decode(outputs[0][input_ids.shape[-1]:], skip_special_tokens=True)
 *
 * @param {Array} messages - Conversation messages
 * @param {Function} onToken - Callback receiving final full text (called once after generation)
 * @param {Function} onComplete - Callback receiving final full response text
 * @returns {Promise<string>} The full generated response text
 */
export async function generateResponse(messages, onToken, onComplete) {
  // Create interruptible stopping criteria for stop-generation support
  currentStoppingCriteria = new InterruptableStoppingCriteria();

  // Transform messages to flat format expected by processor.apply_chat_template().
  // Our app uses nested content arrays: { role, content: [{ type: 'text', text: '...' }] }
  // The processor expects flat format: { role, content: '...' }
  const formattedMessages = messages.map((msg) => ({
    role: msg.role,
    content:
      typeof msg.content === "string"
        ? msg.content
        : msg.content?.[0]?.type === "text"
          ? msg.content[0].text
          : "",
  }));

  // Apply the model's chat template (handles special tokens, formatting, etc.)
  // Pass enable_thinking from LLM config to control reasoning mode.
  // Qwen3.5 outputs <thinking>...</thinking> blocks when enabled.
  // max_thinking_tokens limits the token budget for the reasoning process.
  const { llmConfig } = getState();
  const templateOptions = {
    add_generation_prompt: true,
    enable_thinking: llmConfig.enableThinking,
  };
  if (llmConfig.enableThinking) {
    templateOptions.max_thinking_tokens = llmConfig.maxThinkingTokens;
  }
  const text = processor.apply_chat_template(
    formattedMessages,
    templateOptions,
  );

  // Tokenize the formatted text
  const inputs = await processor(text);

  // Record input sequence length so we can extract only the generated tokens
  const inputLength = inputs.input_ids.dims[1];

  // Generate using the model directly (low-level API for multi-modal models).
  // IMPORTANT: No streamer is used. TextStreamer corrupts Qwen3.5 output
  // due to buggy incremental BPE decoding in transformers.js.
  //
  // Generation parameters are read from llmConfig.generation. These include:
  // - temperature: controls randomness (0.0-2.0)
  // - top_p: nucleus sampling threshold (0.0-1.0)
  // - top_k: top-k sampling (1-100)
  // - min_p: min-p sampling (0.0-1.0)
  // - max_new_tokens: maximum tokens to generate
  // - presence_penalty: penalizes new tokens based on presence (-2.0 to 2.0)
  // - repetition_penalty: penalizes repeated tokens (0.1-2.0)
  const {
    llmConfig: { generation },
  } = getState();
  const output = await model.generate({
    ...inputs,
    max_new_tokens: generation.max_new_tokens,
    do_sample: true,
    temperature: generation.temperature,
    top_p: generation.top_p,
    top_k: generation.top_k,
    min_p: generation.min_p,
    presence_penalty: generation.presence_penalty,
    repetition_penalty: generation.repetition_penalty,
    stopping_criteria: [currentStoppingCriteria],
  });

  // Decode all generated tokens in one shot using the tokenizer.
  // This avoids the incremental decoding bug in TextStreamer.
  //
  // Extract the raw token IDs from the output tensor, slice off the input
  // prefix, and decode the remaining generated tokens as a single batch.
  const rawOutput = Array.from(output.data);
  const generatedTokenIds = rawOutput.slice(inputLength);
  const fullText = processor.tokenizer.decode(generatedTokenIds, {
    skip_special_tokens: true,
  });

  // Exact output token count from the generated token IDs
  const outputTokenCount = generatedTokenIds.length;

  // Dispatch to UI callbacks
  if (onToken) onToken(fullText);
  if (onComplete) onComplete(fullText, { outputTokenCount });

  currentStoppingCriteria = null;
  return { text: fullText, outputTokenCount };
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
 * Dispose the LLM model, freeing memory.
 */
export async function unloadLLM() {
  if (model) {
    await model.dispose();
    model = null;
  }
}

/**
 * Check if the LLM model is currently loaded.
 */
export function isLLMLoaded() {
  return model !== null;
}
