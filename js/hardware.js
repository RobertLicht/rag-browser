// hardware.js — Hardware detection (WebGPU, device memory) and runtime config selection

/**
 * Check if WebGPU is available and functional.
 * Requests an actual adapter to confirm GPU support (not just API presence).
 */
async function checkWebGPU() {
  if (!navigator.gpu) return false;
  try {
    // Chrome logs "No available adapters." to console.warn when requestAdapter()
    // returns null. We temporarily suppress console.warn to avoid polluting the
    // user's console with this expected message — the app falls back to WASM anyway.
    const originalWarn = console.warn;
    console.warn = () => {};
    try {
      const adapter = await navigator.gpu.requestAdapter();
      return !!adapter;
    } finally {
      console.warn = originalWarn;
    }
  } catch {
    return false;
  }
}

/**
 * WebGPU LLM model: Qwen3.5-2B (multimodal, 2B params).
 * Requires WebGPU because its q4 quantization uses GatherBlockQuantized,
 * a custom ONNX operator with no WASM implementation.
 */
const LLM_MODEL_WEBGPU = "huggingworld/Qwen3.5-2B-ONNX";

/**
 * WASM LLM model: Qwen3-0.6B (text-only, 0.6B params).
 * Uses standard q8 quantization compatible with WASM backend.
 * Context window: 4096 tokens (model limitation).
 */
const LLM_MODEL_WASM = "onnx-community/Qwen3-0.6B-ONNX";

/**
 * Detect hardware capabilities and return optimal runtime configuration.
 *
 * Returns configuration object with:
 * - webgpuAvailable: boolean
 * - deviceMemoryGB: number (from navigator.deviceMemory, may be undefined)
 * - device: 'webgpu' | 'wasm'
 * - llmModelId: HuggingFace model ID for the LLM (varies by backend)
 * - embeddingDtype: quantization for the embedding model
 * - llmDtype: quantization for the LLM (per-component map for Qwen3.5, string for Qwen3)
 *
 * Key decisions:
 * - WebGPU: Qwen3.5-2B with q4 per-component quantization (optimal quality/performance)
 * - WASM:  Qwen3-0.6B with q8 quantization (GatherBlockQuantized not available in WASM)
 *
 * Why different models per backend?
 * The huggingworld/Qwen3.5-2B-ONNX model only exports q4 and fp16 variants.
 * q4 uses GatherBlockQuantized, which has no WASM implementation.
 * q8 is not exported for this model, so WASM cannot run it.
 * Qwen3-0.6B (0.6B params) with q8 quantization is the best WASM-compatible alternative.
 */
export async function detectHardware() {
  const webgpuAvailable = await checkWebGPU();
  const deviceMemory = navigator.deviceMemory;

  return {
    webgpuAvailable,
    deviceMemoryGB: deviceMemory,
    device: webgpuAvailable ? "webgpu" : "wasm",
    // LLM model ID: WebGPU gets Qwen3.5-2B (multimodal), WASM gets Qwen3-0.6B (text-only)
    llmModelId: webgpuAvailable ? LLM_MODEL_WEBGPU : LLM_MODEL_WASM,
    // Embedding model: fp16 on WebGPU for quality, q8 on WASM for compatibility
    embeddingDtype: webgpuAvailable ? "fp16" : "q8",
    // LLM dtype: per-component map for Qwen3.5 (multi-session), simple string for Qwen3-0.6B
    llmDtype: webgpuAvailable
      ? { embed_tokens: "q4", vision_encoder: "q4", decoder_model_merged: "q4" }
      : "q8",
  };
}
