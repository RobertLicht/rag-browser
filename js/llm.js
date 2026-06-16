// llm.js — LLM model loader, generation (batch decode), and disposal

import {
  AutoProcessor,
  Qwen3_5ForConditionalGeneration,
  InterruptableStoppingCriteria,
  pipeline,
} from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.2.0/+esm";

import { getState } from "./state.js";

// ─── Model-specific constants ──────────────────────────────────────────

const LLM_MODEL_WEBGPU = "huggingworld/Qwen3.5-2B-ONNX";

// Qwen3.5-2B (WebGPU): 32K practical context in browser
const CONTEXT_WINDOW_WEBGPU = 32768;
// Qwen3-0.6B (WASM): 4K native context
const CONTEXT_WINDOW_WASM = 4096;

// ─── Module state ──────────────────────────────────────────────────────

let processor = null;
let model = null; // Qwen3.5 low-level model
let generator = null; // Pipeline generator for Qwen3-0.6B
let currentStoppingCriteria = null;
let modelType = null; // 'qwen3_5' | 'pipeline'

/**
 * Return the context window for the currently loaded model.
 */
export function getContextWindow() {
  if (modelType === "qwen3_5") return CONTEXT_WINDOW_WEBGPU;
  return CONTEXT_WINDOW_WASM;
}

/**
 * Check if the currently loaded model supports thinking mode.
 */
export function supportsThinking() {
  return modelType === "qwen3_5";
}

/**
 * Load the LLM processor and model.
 *
 * WebGPU  → Qwen3.5-2B: low-level API (multi-modal architecture)
 * WASM    → Qwen3-0.6B: pipeline API (text-only causal LM)
 *
 * @param {Object} config - Hardware config with llmModelId, llmDtype and device
 * @param {Function} [onProgress] - Optional progress callback from transformers.js
 */
export async function loadLLM(config, onProgress) {
  if (config.llmModelId === LLM_MODEL_WEBGPU) {
    // ── Qwen3.5-2B (WebGPU) — low-level API ──────────────────────────
    // Uses AutoProcessor (multi-modal) + Qwen3_5ForConditionalGeneration.
    // The pipeline() API does NOT correctly handle this architecture.
    modelType = "qwen3_5";
    processor = await AutoProcessor.from_pretrained(config.llmModelId);
    model = await Qwen3_5ForConditionalGeneration.from_pretrained(
      config.llmModelId,
      {
        dtype: config.llmDtype,
        device: config.device,
        progress_callback: onProgress,
      },
    );
  } else {
    // ── Qwen3-0.6B (WASM) — pipeline API ─────────────────────────────
    // Simple decoder-only model. pipeline() handles tokenization,
    // chat templating, and generation automatically.
    modelType = "pipeline";
    generator = await pipeline("text-generation", config.llmModelId, {
      dtype: config.llmDtype,
      device: config.device,
      progress_callback: onProgress,
    });
  }
}

// ─── Generation ────────────────────────────────────────────────────────

/**
 * Generate a response from the LLM.
 *
 * Messages are expected in the nested content format:
 *   [{ role: 'system', content: [{ type: 'text', text: '...' }] }, ...]
 *
 * For Qwen3.5 (WebGPU): applies chat template + model.generate() + batch decode.
 * For Qwen3-0.6B (WASM): converts to flat messages + pipeline call.
 *
 * @param {Array} messages - Conversation messages (nested content format)
 * @param {Function} onToken - Callback receiving final full text (called once after generation)
 * @param {Function} onComplete - Callback receiving final full response text
 * @param {Function} [onPhase] - Optional callback for phase updates during generation
 * @returns {Promise<string>} The full generated response text
 */
export async function generateResponse(messages, onToken, onComplete, onPhase) {
  // Create interruptible stopping criteria for stop-generation support
  currentStoppingCriteria = new InterruptableStoppingCriteria();

  const {
    llmConfig: { generation },
  } = getState();

  if (modelType === "qwen3_5") {
    return generateQwen3_5(messages, onToken, onComplete, onPhase, generation);
  }

  // modelType === "pipeline"
  return generatePipeline(messages, onToken, onComplete, onPhase, generation);
}

/**
 * Generate with Qwen3.5-2B (low-level API).
 * Collects all tokens then batch-decodes — avoids TextStreamer incremental
 * BPE decoding bug that corrupts Qwen3.5 output.
 */
async function generateQwen3_5(
  messages,
  onToken,
  onComplete,
  onPhase,
  generation,
) {
  // Transform to flat format for processor.apply_chat_template()
  const formattedMessages = messages.map((msg) => ({
    role: msg.role,
    content:
      typeof msg.content === "string"
        ? msg.content
        : msg.content?.[0]?.type === "text"
          ? msg.content[0].text
          : "",
  }));

  // Apply chat template
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

  // Tokenize
  const inputs = await processor(text);
  const inputLength = inputs.input_ids.dims[1];

  // Phase tracking
  let genInterval = null;
  if (onPhase) {
    const initialPhase = llmConfig.enableThinking
      ? "generating_thinking"
      : "generating";
    onPhase(initialPhase);

    const startTime = Date.now();
    let currentPhase = initialPhase;

    genInterval = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      let newPhase = currentPhase;

      if (llmConfig.enableThinking) {
        if (elapsed >= 50) newPhase = "generating_finalizing";
        else if (elapsed >= 20) newPhase = "generating_formulating";
      } else {
        if (elapsed >= 30) newPhase = "generating_finalizing";
        else if (elapsed >= 10) newPhase = "generating_composing";
      }

      if (newPhase !== currentPhase) {
        currentPhase = newPhase;
        onPhase(newPhase);
      }
    }, 2000);
  }

  try {
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

    // Batch decode all generated tokens
    const rawOutput = Array.from(output.data);
    const generatedTokenIds = rawOutput.slice(inputLength);
    const fullText = processor.tokenizer.decode(generatedTokenIds, {
      skip_special_tokens: true,
    });

    const outputTokenCount = generatedTokenIds.length;

    if (onToken) onToken(fullText);
    if (onComplete) onComplete(fullText, { outputTokenCount });

    currentStoppingCriteria = null;
    return { text: fullText, outputTokenCount };
  } finally {
    if (genInterval) clearInterval(genInterval);
  }
}

/**
 * Generate with Qwen3-0.6B via pipeline API.
 * Converts nested content messages to flat format expected by the pipeline.
 */
async function generatePipeline(
  messages,
  onToken,
  onComplete,
  onPhase,
  generation,
) {
  // Convert nested content messages to flat format for pipeline
  const flatMessages = messages.map((msg) => ({
    role: msg.role,
    content:
      typeof msg.content === "string"
        ? msg.content
        : msg.content?.[0]?.type === "text"
          ? msg.content[0].text
          : "",
  }));

  // Phase tracking
  if (onPhase) onPhase("generating");

  // Generate via pipeline (no streaming — full output at once)
  const output = await generator(flatMessages, {
    max_new_tokens: generation.max_new_tokens,
    do_sample: true,
    temperature: generation.temperature,
    top_p: generation.top_p,
    top_k: generation.top_k,
    repetition_penalty: generation.repetition_penalty,
    return_full_text: false,
    stopping_criteria: [currentStoppingCriteria],
  });

  // Pipeline returns: [{ generated_text: [...messages including assistant response] }]
  // Extract the assistant's response from the last generated message
  const generatedMessages = output[0].generated_text;
  const assistantMessage = generatedMessages[generatedMessages.length - 1];
  const fullText =
    typeof assistantMessage.content === "string"
      ? assistantMessage.content
      : "";

  // Estimate output tokens from text length (~4 chars per token)
  const outputTokenCount = Math.ceil(fullText.length / 4);

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
  if (generator) {
    await generator.dispose();
    generator = null;
  }
  modelType = null;
  processor = null;
}

/**
 * Check if the LLM model is currently loaded.
 */
export function isLLMLoaded() {
  return (model !== null || generator !== null) && modelType !== null;
}
