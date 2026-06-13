// hardware.js — Hardware detection (WebGPU, device memory) and runtime config selection

/**
 * Check if WebGPU is available and functional.
 * Requests an actual adapter to confirm GPU support (not just API presence).
 */
async function checkWebGPU() {
  if (!navigator.gpu) return false;
  try {
    const adapter = await navigator.gpu.requestAdapter();
    return !!adapter;
  } catch {
    return false;
  }
}

/**
 * Detect hardware capabilities and return optimal runtime configuration.
 *
 * Returns configuration object with:
 * - webgpuAvailable: boolean
 * - deviceMemoryGB: number (from navigator.deviceMemory, may be undefined)
 * - device: 'webgpu' | 'wasm'
 * - embeddingDtype: quantization for the embedding model
 * - llmDtype: per-component quantization map for the LLM
 *
 * Key Decision: Use q4 quantization for LLM on both WebGPU and WASM.
 * Even with WebGPU, fp16 for the full Qwen3.5-2B may exceed browser tab memory limits (~4–8 GB).
 * q4 provides the best balance of quality and memory usage.
 */
export async function detectHardware() {
  const webgpuAvailable = await checkWebGPU();
  const deviceMemory = navigator.deviceMemory;

  return {
    webgpuAvailable,
    deviceMemoryGB: deviceMemory,
    device: webgpuAvailable ? 'webgpu' : 'wasm',
    // Embedding model: fp16 on WebGPU for quality, q8 on WASM for compatibility
    embeddingDtype: webgpuAvailable ? 'fp16' : 'q8',
    // LLM model: q4 on WebGPU, q4fp16 on WASM
    llmDtype: webgpuAvailable
      ? { embed_tokens: 'q4', vision_encoder: 'q4', decoder_model_merged: 'q4' }
      : { embed_tokens: 'q4fp16', vision_encoder: 'q4fp16', decoder_model_merged: 'q4fp16' },
  };
}
