// wasmWorker.js — Web Worker for WASM inference (embedding + LLM)
//
// Runs Transformers.js pipelines in a dedicated thread so the main UI
// remains responsive during WASM (CPU) inference.  WebGPU cannot be
// used inside a Web Worker (adapter transfer is not supported), so
// this worker is only used when hardware.device === 'wasm'.

import {
  env,
  pipeline,
  AutoProcessor,
  Qwen3_5ForConditionalGeneration,
  InterruptableStoppingCriteria,
} from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.2.0/+esm";

// ── WASM Performance Configuration ─────────────────────────────────────
// Enable SIMD for 2-4x performance boost on CPU. Must be set BEFORE any
// pipeline() call, as ONNX Runtime caches the configuration on first use.
env.backends.onnx.wasm.simd = true;

// Multi-threading: distribute computation across CPU cores via SharedArrayBuffer.
// Cap threads to avoid context-switching overhead on high-core machines.
// Note: multi-threading only activates when the page is crossOriginIsolated
// (requires COOP/COEP headers from the server). Without these headers,
// the runtime gracefully falls back to single-threaded WASM (~3-4x slower).
const maxThreads = Math.min(navigator.hardwareConcurrency || 4, 8);
env.backends.onnx.wasm.numThreads = maxThreads;

// Log multi-threading status at startup so users know if COOP/COEP headers are active.
const sharedArrayBufferAvailable = typeof SharedArrayBuffer !== "undefined";
const threadMode = sharedArrayBufferAvailable
  ? "multi-threaded WASM active"
  : "single-threaded fallback (3-4x slower)";
console.log(
  `[wasmWorker] SIMD: enabled | Threads: ${maxThreads} | SharedArrayBuffer: ${sharedArrayBufferAvailable} (${threadMode})`,
);

// ── Model references ──────────────────────────────────────────────────
let extractor = null;
let processor = null;
let model = null;
let generator = null;
let currentStoppingCriteria = null;

const LLM_MODEL_WEBGPU = "huggingworld/Qwen3.5-2B-ONNX";

// Cap output tokens for WASM pipeline mode.  q4 WASM does ~2-5 tok/s,
// so 1024 tokens ≈ 6-18 min worst-case.  WebGPU is uncapped.
const WASM_MAX_NEW_TOKENS = 1024;

// ── Helper: forward a progress callback ──────────────────────────────
function forwardProgress(progressCallback, tag) {
  if (!progressCallback) return undefined;
  return (info) => {
    self.postMessage({ type: "progress", tag, info });
  };
}

// ── Message handler ──────────────────────────────────────────────────
self.onmessage = async (e) => {
  const { id, type, payload } = e.data;

  try {
    switch (type) {
      // ── Embedding ──────────────────────────────────────────────
      case "load-embedding": {
        const { modelId, dtype, device } = payload;
        extractor = await pipeline(
          "feature-extraction",
          modelId ?? "onnx-community/Qwen3-Embedding-0.6B-ONNX",
          {
            dtype,
            device,
            progress_callback: forwardProgress(
              payload.progress_callback,
              "embedding",
            ),
          },
        );
        self.postMessage({ id, type: "result", payload: { status: "ready" } });
        break;
      }

      case "unload-embedding": {
        if (extractor) {
          await extractor.dispose();
          extractor = null;
        }
        self.postMessage({ id, type: "result", payload: {} });
        break;
      }

      case "embed-query": {
        if (!extractor) throw new Error("Embedding model not loaded");
        const { text, taskInstruction } = payload;
        const instructed = taskInstruction
          ? `Instruct: ${taskInstruction}\nQuery:${text}`
          : text;
        const output = await extractor(instructed, {
          pooling: "last_token",
          normalize: true,
        });
        self.postMessage({
          id,
          type: "result",
          payload: { data: Array.from(output.data) },
        });
        break;
      }

      case "embed-documents": {
        if (!extractor) throw new Error("Embedding model not loaded");
        const { texts } = payload;
        const output = await extractor(texts, {
          pooling: "last_token",
          normalize: true,
        });
        self.postMessage({
          id,
          type: "result",
          payload: { data: Array.from(output.data) },
        });
        break;
      }

      // ── LLM (pipeline mode — Qwen3-0.6B-Instruct) ────────────────────
      case "load-llm": {
        const { modelId, dtype, device } = payload;
        if (modelId === LLM_MODEL_WEBGPU) {
          // Shouldn't happen on WASM path, but handle gracefully
          processor = await AutoProcessor.from_pretrained(modelId, {
            progress_callback: forwardProgress(
              payload.progress_callback,
              "llm",
            ),
          });
          model = await Qwen3_5ForConditionalGeneration.from_pretrained(
            modelId,
            {
              dtype: payload.llmDtype,
              device,
              progress_callback: forwardProgress(
                payload.progress_callback,
                "llm",
              ),
            },
          );
        } else {
          generator = await pipeline(
            "text-generation",
            modelId ?? "onnx-community/Qwen3-0.6B-Instruct-ONNX",
            {
              dtype,
              device,
              progress_callback: forwardProgress(
                payload.progress_callback,
                "llm",
              ),
            },
          );

          // The ONNX export stores the chat template in a separate
          // chat_template.jinja file, which transformers.js does not
          // auto-load.  Patch it in so the pipeline can format messages.
          if (generator.tokenizer && !generator.tokenizer.chat_template) {
            generator.tokenizer.chat_template = [
              // System message (only on the first turn)
              '{%- if messages[0].role == "system" %}',
              '    {{ "<|im_start|>system\\n" + messages[0].content + "<|im_end|>\\n" }}',
              "{%- endif %}",
              // Remaining user/assistant turns
              '{%- for message in (messages if messages[0].role != "system" else messages[1:]) %}',
              '    {{ "<|im_start|>" + message.role + "\\n" + message.content + "<|im_end|>\\n" }}',
              "{%- endfor %}",
              // Prompt the model to generate
              "{%- if add_generation_prompt %}<|im_start|>assistant\\n{%- endif %}",
            ].join("\n");
          }
          // Warm-up: run a tiny inference to JIT-compile WASM kernels.
          // This eliminates cold-start latency on the first real user query.
          // We generate just 1 token so it completes in under a second.
          try {
            await generator([{ role: "user", content: "Hi" }], {
              max_new_tokens: 1,
              do_sample: false,
            });
          } catch {
            // Warm-up is best-effort; ignore errors
          }
        }
        self.postMessage({ id, type: "result", payload: { status: "ready" } });
        break;
      }

      case "unload-llm": {
        if (model) {
          await model.dispose();
          model = null;
        }
        if (generator) {
          await generator.dispose();
          generator = null;
        }
        processor = null;
        self.postMessage({ id, type: "result", payload: {} });
        break;
      }

      case "generate": {
        if (!generator && !model) throw new Error("LLM not loaded");
        const { messages, generation } = payload;

        currentStoppingCriteria = new InterruptableStoppingCriteria();

        if (generator) {
          // ── Pipeline mode (Qwen3-0.6B-Instruct) ────────────────────
          const cappedTokens = Math.min(
            generation.max_new_tokens,
            WASM_MAX_NEW_TOKENS,
          );
          const output = await generator(messages, {
            max_new_tokens: cappedTokens,
            do_sample: generation.do_sample ?? true,
            temperature: generation.temperature,
            top_p: generation.top_p,
            top_k: generation.top_k,
            repetition_penalty: generation.repetition_penalty,
            return_full_text: false,
            stopping_criteria: [currentStoppingCriteria],
          });

          const generatedMessages = output[0].generated_text;
          const assistantMessage =
            generatedMessages[generatedMessages.length - 1];
          const fullText =
            typeof assistantMessage.content === "string"
              ? assistantMessage.content
              : "";

          self.postMessage({
            id,
            type: "result",
            payload: {
              text: fullText,
              outputTokenCount: Math.ceil(fullText.length / 4),
            },
          });
        } else {
          // ── Low-level mode (Qwen3.5) ───────────────────────────
          // Transform to flat format for chat template
          const formattedMessages = messages.map((msg) => ({
            role: msg.role,
            content:
              typeof msg.content === "string"
                ? msg.content
                : msg.content?.[0]?.type === "text"
                  ? msg.content[0].text
                  : "",
          }));

          const text = processor.apply_chat_template(formattedMessages, {
            add_generation_prompt: true,
          });

          const inputs = await processor(text);
          const inputLength = inputs.input_ids.dims[1];

          const output = await model.generate({
            ...inputs,
            max_new_tokens: Math.min(
              generation.max_new_tokens,
              WASM_MAX_NEW_TOKENS,
            ),
            do_sample: generation.do_sample ?? true,
            temperature: generation.temperature,
            top_p: generation.top_p,
            top_k: generation.top_k,
            min_p: generation.min_p,
            presence_penalty: generation.presence_penalty,
            repetition_penalty: generation.repetition_penalty,
            stopping_criteria: [currentStoppingCriteria],
          });

          const rawOutput = Array.from(output.data);
          const generatedTokenIds = rawOutput.slice(inputLength);
          const fullText = processor.tokenizer.decode(generatedTokenIds, {
            skip_special_tokens: true,
          });

          self.postMessage({
            id,
            type: "result",
            payload: {
              text: fullText,
              outputTokenCount: generatedTokenIds.length,
            },
          });
        }

        currentStoppingCriteria = null;
        break;
      }

      case "stop-generation": {
        if (currentStoppingCriteria) {
          currentStoppingCriteria.interrupt();
          currentStoppingCriteria = null;
        }
        self.postMessage({ id, type: "result", payload: {} });
        break;
      }

      default:
        self.postMessage({
          id,
          type: "error",
          payload: { message: `Unknown message type: ${type}` },
        });
    }
  } catch (error) {
    self.postMessage({
      id,
      type: "error",
      payload: { message: error.message, stack: error.stack },
    });
  }
};
