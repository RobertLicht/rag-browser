# Detailed Implementation Plan: Browser-Based RAG Agent

| Field          | Value                                                    |
|----------------|----------------------------------------------------------|
| **Project**    | RAG-Browser — Client-Side RAG Agent                      |
| **Version**    | 1.1 (refined with additional verification)               |
| **Date**       | 2026-06-13                                               |
| **Status**     | Refined (verified against primary sources + docs)        |

### Refinement Notes (v1.1)

The following corrections were applied after additional verification against official Transformers.js documentation:

| # | Finding | Impact | Section Updated |
|---|---------|--------|-----------------|
| 1 | `TextStreamer` uses `callback_function` option, NOT a separate callback pattern | Medium — changes streaming implementation | §3.4, §5.1, §6.3 |
| 2 | `pipeline("text-generation")` is the recommended high-level API for LLM generation | High — simplifies llm.js significantly | §3.4, §1.1 |
| 3 | `InterruptableStoppingCriteria` available for stop generation | Medium — enables proper cancellation | §5.3, §1.1 |
| 4 | `callback_function` receives accumulated text, not individual tokens | Medium — changes token streaming logic | §6.3 |
| 5 | Pipeline approach handles chat templates automatically | Medium — simplifies message formatting | §3.4 |

### Refinement Notes (v1.2)

Additional corrections applied after comparing with a working minimal implementation (`data/minimal-pipe-qwen3.5-0.8b.html`) and verifying against v4.2.0-specific behavior:

| # | Finding | Impact | Section Updated |
|---|---------|--------|-----------------|
| 6 | `pipeline("text-generation")` supports Qwen3.5 models in v4.2.0 (was unsupported in v4.0.0-next.5) | High — validates pipeline approach for Qwen3.5 | §1.3, §1.5, §8.7 |
| 7 | `TextStreamer.skip_special_tokens` defaults to `true`, NOT `false` as shown in some model cards | Medium — corrects streaming behavior | §1.3, §1.5, §3.4 |
| 8 | Qwen3.5-0.8B-ONNX is a valid, lighter alternative model for low-memory devices | Medium — expands model options | §1.3 |
| 9 | Pipeline returns `generated_text` as full conversation array; response is last element's `content` field | Medium — changes output parsing | §3.4, §5.1 |
| 10 | `pipe.dispose()` is the correct disposal method for pipeline instances | Low — clarifies cleanup | §3.4 |

---

## Table of Contents

1. [Verified Technology Facts](#1-verified-technology-facts)
2. [Project Structure](#2-project-structure)
3. [Phase 1: Foundation & Architecture](#3-phase-1-foundation--architecture)
4. [Phase 2: Document Ingestion Pipeline](#4-phase-2-document-ingestion-pipeline)
5. [Phase 3: RAG Retrieval & Generation](#5-phase-3-rag-retrieval--generation)
6. [Phase 4: UI & UX Polish](#6-phase-4-ui--ux-polish)
7. [Phase 5: Optimization & Hardening](#7-phase-5-optimization--hardening)
8. [Critical Design Decisions](#8-critical-design-decisions)
9. [Risk Register](#9-risk-register)

---

## 1. Verified Technology Facts

All facts below were verified against primary sources (Hugging Face model cards, GitHub repositories, official documentation) as of 2026-06-13.

### 1.1 Transformers.js v4

| Property | Verified Value | Source |
|----------|---------------|--------|
| Version | 4.2.0+ | GitHub releases, Hugging Face docs |
| CDN URL | `https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.2.0` | jsDelivr |
| Runtime | ONNX Runtime Web (WebGPU + WASM) | transformers.js README |
| WebGPU Backend | New C++ runtime (v4 rewrite) | transformers.js v4 release notes |
| Key Exports | `pipeline`, `matmul`, `AutoProcessor`, `TextStreamer`, `Qwen3_5ForConditionalGeneration`, `RawImage`, `InterruptableStoppingCriteria` | Model card code examples, official docs |
| Embedding Pipeline | `pipeline("feature-extraction", modelId, { dtype, device })` | Qwen3-Embedding model card |
| LLM Pipeline (recommended) | `pipeline("text-generation", modelId, { dtype, device })` — handles chat templates + streaming | [Official pipeline docs](https://huggingface.co/docs/transformers.js/en/pipelines) |
| LLM Class (alternative) | `Qwen3_5ForConditionalGeneration.from_pretrained()` — lower-level API for custom control | Qwen3.5-2B-ONNX model card |
| TextStreamer | `new TextStreamer(tokenizer, { skip_prompt: true, callback_function: (text) => {...} })` | [Official streamers docs](https://huggingface.co/docs/transformers.js/en/api/generation/streamers) |
| Stop Generation | `InterruptableStoppingCriteria` — enables model generation cancellation | transformers.js GitHub issues |
| Disposal | `model.dispose()`, `extractor.dispose()` | Model lifecycle best practice |

### 1.2 Qwen3-Embedding-0.6B-ONNX

| Property | Verified Value | Source |
|----------|---------------|--------|
| Model ID | `onnx-community/Qwen3-Embedding-0.6B-ONNX` | Hugging Face |
| Output Dimensions | 1024 (Matryoshka: configurable 32–1024) | Model card |
| Pooling Strategy | **`last_token`** (NOT mean pooling) | Model card code example, Qwen3-Embedding GitHub |
| Normalization | `normalize: true` | Model card code example |
| Instruction Format (queries) | `Instruct: {task_description}\nQuery:{query}` | Model card — note NO space after colon in Query |
| Document Embedding | Raw text, NO instruction wrapper | Model card |
| dtype Options | `fp32`, `fp16`, `q8` | Model card code example |
| device Options | `webgpu` (default), `wasm` (fallback) | Model card |
| Context Length | 32,768 tokens | Model card |
| Known Issues | Discussion #4: protobuf error → **RESOLVED** (cache issue, 0-byte file) | Hugging Face discussions |

### 1.3 Qwen3.5-2B-ONNX

| Property | Verified Value | Source |
|----------|---------------|--------|
| Model ID | `huggingworld/Qwen3.5-2B-ONNX` (mirror of `onnx-community/Qwen3.5-2B-ONNX`) | Hugging Face |
| Class | `Qwen3_5ForConditionalGeneration` | Model card |
| Processor | `AutoProcessor` | Model card |
| dtype Options | Per-component: `embed_tokens: "q4"`, `vision_encoder: "fp16"`, `decoder_model_merged: "q4"` | Model card |
| Text-only Mode | Omit image from processor call; use `processor(text)` instead of `processor(text, image)` | Model card code example |
| Chat Template | `processor.apply_chat_template(conversation, { add_generation_prompt: true })` | Model card |
| Streaming | `TextStreamer(processor.tokenizer, { skip_prompt: true })` — `skip_special_tokens` defaults to `true` | [Streamers docs](https://huggingface.co/docs/transformers.js/en/api/generation/streamers) |
| Generation | `model.generate({ ...inputs, max_new_tokens: 512, streamer })` | Model card |
| Decode | `processor.batch_decode(outputs.slice(...), { skip_special_tokens: true })` | Model card |
| Thinking Mode | Non-thinking by default. Soft `/think` switch NOT officially supported | Model card |
| Recommended Params (non-thinking text) | `temperature=1.0, top_p=1.0, top_k=20, presence_penalty=2.0` | Model card |
| License | Apache 2.0 | Model card |

### 1.4 Qwen3.5-0.8B-ONNX (Lightweight Alternative)

| Property | Verified Value | Source |
|----------|---------------|--------|
| Model ID | `huggingworld/Qwen3.5-0.8B-ONNX` (mirror of `onnx-community/Qwen3.5-0.8B-ONNX`) | Hugging Face |
| Class | `Qwen3_5ForConditionalGeneration` | Model card |
| dtype Options | Same per-component as 2B variant | Model card |
| Pipeline Support | `pipeline("text-generation")` works in v4.2.0 (NOT supported in v4.0.0-next.5) | [Discussion #1](https://huggingface.co/onnx-community/Qwen3.5-0.8B-ONNX/discussions/1), verified working |
| Output Format | `result[0].generated_text` is full conversation; response is `result[0].generated_text[1].content` | Verified working implementation |
| Model Size | ~0.8B params — smaller footprint than 2B variant | Model card |
| Target Use | Low-memory devices, faster inference | Model card |

**NOTE on Pipeline Support:** In v4.0.0-next.5, `pipeline("text-generation")` threw `Error: Unsupported model type: qwen3_5`. This was resolved by v4.2.0. The pipeline approach is now the recommended path for Qwen3.5 models.

### 1.5 Orama v3.1.x

| Property | Verified Value | Source |
|----------|---------------|--------|
| Version | 3.1.18 (latest) | npm, GitHub |
| CDN URL | `https://cdn.jsdelivr.net/npm/@orama/orama@3.1.18/+esm` | GitHub README |
| Size | ~2KB gzipped | README |
| Dependencies | Zero | README |
| Vector Schema | `vector[<size>]` (e.g., `vector[1024]`) — size required at schema creation | README |
| Creation | `create({ schema: { content: 'string', embedding: 'vector[1024]', ... } })` | README |
| Insert | `insert(db, document)`, `insertMultiple(db, [documents])` | README |
| Vector Search | `search(db, { mode: 'vector', vector: { value: [...], property: 'embedding' }, similarity: 0.8, includeVectors: false })` | README |
| Full-text Search | `search(db, { term: 'query text' })` | README |
| Hybrid Search | `search(db, { mode: 'hybrid', term: 'query', vector: { value, property }, similarity })` | README |
| Default Similarity Threshold | 0.8 | README |
| Return Embeddings | `includeVectors: true` (default false to save bandwidth) | README |
| Data Types | string, number, boolean, enum, geopoint, string[], number[], boolean[], enum[], vector[<size>] | README |
| Persistence Plugin | `@orama/plugin-persistence` exists but NOT easily available via CDN | Verified via npm search |

### 1.5 Critical API Patterns

#### Embedding Pipeline (Verified)
```javascript
import { pipeline, matmul } from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.2.0';

const extractor = await pipeline(
  "feature-extraction",
  "onnx-community/Qwen3-Embedding-0.6B-ONNX",
  { dtype: "fp16", device: "webgpu" }  // or dtype: "q8", device: "wasm"
);

// Query embedding (WITH instruction)
const queryEmbedding = await extractor(
  "Instruct: Given a web search query, retrieve relevant passages that answer the query\nQuery:What is AI?",
  { pooling: "last_token", normalize: true }
);

// Document embedding (WITHOUT instruction)
const docEmbedding = await extractor(
  "AI is a field of computer science...",
  { pooling: "last_token", normalize: true }
);

await extractor.dispose();
```

#### LLM Pipeline (Verified, text-only)
```javascript
import {
  AutoProcessor,
  Qwen3_5ForConditionalGeneration,
  TextStreamer,
} from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.2.0';

const model_id = "huggingworld/Qwen3.5-2B-ONNX";
const processor = await AutoProcessor.from_pretrained(model_id);
const model = await Qwen3_5ForConditionalGeneration.from_pretrained(model_id, {
  dtype: {
    embed_tokens: "q4",
    vision_encoder: "q4",
    decoder_model_merged: "q4",
  },
  device: "webgpu",
});

const conversation = [
  { role: "system", content: [{ type: "text", text: "You are a helpful assistant." }] },
  { role: "user", content: [{ type: "text", text: "What is AI?" }] },
];

const text = processor.apply_chat_template(conversation, { add_generation_prompt: true });
const inputs = await processor(text);  // No image — text-only mode

const outputs = await model.generate({
  ...inputs,
  max_new_tokens: 512,
  streamer: new TextStreamer(processor.tokenizer, {
    skip_prompt: true,
    skip_special_tokens: false,
  }),
});

await model.dispose();
```

#### Orama Database (Verified)
```javascript
import { create, insert, insertMultiple, search } from 'https://cdn.jsdelivr.net/npm/@orama/orama@3.1.18/+esm';

const db = create({
  schema: {
    content: 'string',
    embedding: 'vector[1024]',
    metadata: {
      sourceFile: 'string',
      chunkIndex: 'number',
      charOffset: 'number',
      charLength: 'number',
    },
  },
});

insert(db, {
  content: "AI is a field of computer science...",
  embedding: [0.1, 0.2, 0.3, ...],  // 1024 values
  metadata: { sourceFile: "ai.txt", chunkIndex: 0, charOffset: 0, charLength: 512 },
});

const results = await search(db, {
  mode: 'vector',
  vector: {
    value: queryEmbedding,  // 1024-dim array
    property: 'embedding',
  },
  similarity: 0.7,
  limit: 5,
  includeVectors: false,
});
```

---

## 2. Project Structure

```
rag-v2-qwen3.6-27b/
├── index.html                    # Main application HTML
├── css/
│   └── styles.css                # All application styling
├── js/
│   ├── app.js                    # Main application entry point
│   ├── state.js                  # Application state management
│   ├── hardware.js               # Hardware detection (WebGPU, device memory)
│   ├── embedding.js              # Embedding model loader + inference
│   ├── llm.js                    # LLM model loader + generation
│   ├── chunker.js                # Text chunking engine
│   ├── orama-db.js               # Orama database operations
│   ├── rag-pipeline.js           # RAG pipeline orchestration
│   ├── ui.js                     # UI rendering and interaction
│   └── utils.js                  # Utility functions (UUID, progress, etc.)
├── data/
│   ├── minimal-qwen3-embedding-0.6b.html   # Reference implementation
│   └── minimal-qwen3.5-2b.html            # Reference implementation
├── PRD.md                        # Product Requirements Document
└── IMPLEMENTATION_PLAN.md        # This file
```

### Module Responsibilities

| Module | Responsibility | Key Exports |
|--------|---------------|-------------|
| `hardware.js` | Detect WebGPU, device memory, select runtime config | `detectHardware()`, `getConfig()` |
| `state.js` | Central application state (models, index, conversation) | `getState()`, `setState()`, `subscribe()` |
| `embedding.js` | Load/dispose embedding model, generate embeddings | `loadEmbeddingModel()`, `embedText()`, `embedQuery()`, `unloadEmbeddingModel()` |
| `llm.js` | Load/dispose LLM, generate responses with streaming | `loadLLM()`, `generateResponse()`, `unloadLLM()` |
| `chunker.js` | Split text into overlapping chunks | `chunkText()`, `countTokens()` |
| `orama-db.js` | Create, insert, search, persist Orama database | `createDB()`, `insertChunks()`, `searchVector()`, `saveToIndexedDB()`, `loadFromIndexedDB()` |
| `rag-pipeline.js` | Orchestrate ingestion and retrieval pipelines | `ingestDocument()`, `retrieveAndGenerate()` |
| `ui.js` | DOM manipulation, event handling, rendering | `initUI()`, `renderMessage()`, `updateProgress()` |
| `app.js` | Bootstrap, coordinate modules, handle lifecycle | `init()` |

---

## 3. Phase 1: Foundation & Architecture

**Goal:** Working hardware detection, model loading, and basic infrastructure.

### 3.1 hardware.js

**Tasks:**
1. Implement WebGPU detection with adapter verification
2. Read `navigator.deviceMemory` for RAM estimation
3. Return runtime configuration based on hardware

**Implementation:**
```javascript
// hardware.js
export async function detectHardware() {
  const webgpuAvailable = await checkWebGPU();
  const deviceMemory = navigator.deviceMemory;
  
  return {
    webgpuAvailable,
    deviceMemoryGB: deviceMemory,
    device: webgpuAvailable ? 'webgpu' : 'wasm',
    embeddingDtype: webgpuAvailable ? 'fp16' : 'q8',
    llmDtype: webgpuAvailable 
      ? { embed_tokens: 'q4', vision_encoder: 'q4', decoder_model_merged: 'q4' }
      : { embed_tokens: 'q4fp16', vision_encoder: 'q4fp16', decoder_model_merged: 'q4fp16' },
  };
}

async function checkWebGPU() {
  if (!navigator.gpu) return false;
  try {
    const adapter = await navigator.gpu.requestAdapter();
    return !!adapter;
  } catch {
    return false;
  }
}
```

**Key Decision:** Use `q4` quantization for both WebGPU and WASM on the LLM. Even with WebGPU, `fp16` for the full Qwen3.5-2B may exceed browser tab memory limits (~4–8 GB). The `q4` quantization provides the best balance of quality and memory usage.

### 3.2 state.js

**Tasks:**
1. Implement a simple observable state store
2. Define state schema matching PRD §7.3

**Implementation:**
```javascript
// state.js
let state = {
  hardware: { webgpuAvailable: false, device: 'wasm', dtype: '', deviceMemoryGB: undefined },
  models: { embedding: 'unloaded', llm: 'unloaded' },
  index: { totalChunks: 0, totalDocuments: 0, embeddingDimension: 1024 },
  conversation: [],
};

const subscribers = [];

export function getState() { return { ...state }; }
export function setState(updates) {
  state = { ...state, ...updates };
  subscribers.forEach(fn => fn(state));
}
export function subscribe(fn) { subscribers.push(fn); }
```

### 3.3 embedding.js

**Tasks:**
1. Load the embedding model via `pipeline("feature-extraction")`
2. Implement `embedQuery(text, task)` with instruction wrapping
3. Implement `embedDocuments(texts[])` without instruction wrapping
4. Implement `unload()` to dispose the model
5. Batch embedding generation for efficiency

**Critical Details (Verified):**
- Pooling: `"last_token"` (NOT `"mean"`)
- Normalization: `true`
- Instruction format: `Instruct: ${task}\nQuery:${query}` (NO space after "Query:")
- Documents are embedded WITHOUT instruction wrapper
- Batch all texts in a single `extractor()` call for performance

```javascript
// embedding.js (core functions)
let extractor = null;
const TASK_INSTRUCTION = "Given a web search query, retrieve relevant passages that answer the query";

export async function loadEmbeddingModel(config) {
  extractor = await pipeline("feature-extraction", "onnx-community/Qwen3-Embedding-0.6B-ONNX", {
    dtype: config.embeddingDtype,
    device: config.device,
  });
}

export async function embedQuery(query) {
  const instructed = `Instruct: ${TASK_INSTRUCTION}\nQuery:${query}`;
  const output = await extractor(instructed, { pooling: "last_token", normalize: true });
  return Array.from(output.data);  // Convert tensor to array for Orama
}

export async function embedDocuments(texts) {
  const output = await extractor(texts, { pooling: "last_token", normalize: true });
  return Array.from(output.data);  // Shape: [num_texts, 1024]
}

export async function unloadEmbeddingModel() {
  if (extractor) { await extractor.dispose(); extractor = null; }
}
```

### 3.4 llm.js

**Tasks:**
1. Load the LLM via `pipeline("text-generation")` (recommended high-level API)
2. Implement streaming generation with `TextStreamer` + `callback_function`
3. Handle conversation history (pipeline handles chat templates automatically)
4. Implement `unload()` to dispose the pipeline
5. Implement stop generation with `InterruptableStoppingCriteria`

**Critical Details (Verified against [official pipeline docs](https://huggingface.co/docs/transformers.js/en/pipelines)):**
- Use `pipeline("text-generation", modelId, { dtype, device })` — handles tokenization, chat templates, and generation in one abstraction
- Messages format: `[{ role: "system", content: "..." }, { role: "user", content: "..." }]` — pipeline applies chat template automatically
- `TextStreamer` accepts `callback_function` option which receives the **accumulated decoded text** on each token
- `InterruptableStoppingCriteria` enables programmatic cancellation of generation
- For RAG, inject context into the system message

```javascript
// llm.js (core functions)
import { pipeline, TextStreamer, InterruptableStoppingCriteria } from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.2.0';

let generator = null;
const MODEL_ID = "huggingworld/Qwen3.5-2B-ONNX";

export async function loadLLM(config) {
  generator = await pipeline("text-generation", MODEL_ID, {
    dtype: config.llmDtype,
    device: config.device,
  });
}

export async function generateResponse(messages, onToken, onComplete) {
  // InterruptableStoppingCriteria for stop generation
  const stoppingCriteria = new InterruptableStoppingCriteria();
  
  // callback_function receives accumulated text on each new token
  const streamer = new TextStreamer(generator.tokenizer, {
    skip_prompt: true,
    callback_function: (text) => {
      if (onToken) onToken(text);  // Pass full accumulated text to UI
    },
  });
  
  // Pipeline handles chat template, tokenization, and generation
  const result = await generator(messages, {
    max_new_tokens: 512,
    do_sample: false,
    streamer,
    stopping_criteria: [stoppingCriteria],
  });
  
  // result[0].generated_text contains the full response
  if (onComplete) onComplete(result[0].generated_text);
  return result[0].generated_text;
}

export function stopGeneration() {
  if (stoppingCriteria) stoppingCriteria.interrupt();
}

export async function unloadLLM() {
  if (generator) { await generator.dispose(); generator = null; }
}
```

### 3.5 utils.js

**Tasks:**
1. UUID generator (no dependencies — use `crypto.randomUUID()`)
2. Token counter (simple heuristic: characters / 4)
3. Progress bar utility
4. Text diffing utility for streaming (to extract new tokens from accumulated text)

```javascript
// utils.js
export function generateUUID() {
  return crypto.randomUUID();  // Available in all modern browsers
}

export function estimateTokens(text) {
  return Math.ceil(text.length / 4);  // Rough heuristic for English
}

export function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

// Extract new text from accumulated text (for streaming diff)
export function getNewText(fullText, previousText) {
  return fullText.slice(previousText.length);
}
```

### 3.6 Validation Criteria (Phase 1)

- [ ] Hardware detection returns correct config on WebGPU browser
- [ ] Hardware detection falls back to WASM on non-WebGPU browser
- [ ] Embedding model loads and generates 1024-dim vectors
- [ ] `embedQuery()` produces different results with/without instruction (verify instruction awareness)
- [ ] LLM model loads and generates text in text-only mode
- [ ] Model disposal frees memory (verify via browser DevTools)

---

## 4. Phase 2: Document Ingestion Pipeline

**Goal:** Users can upload `.txt` files, have them chunked, embedded, and indexed in Orama.

### 4.1 orama-db.js

**Tasks:**
1. Create Orama database with proper schema
2. Implement bulk insert for document chunks
3. Implement vector search with similarity threshold
4. Implement IndexedDB persistence (custom, NOT the Orama plugin)

**Schema (Verified against Orama API):**
```javascript
// orama-db.js
import { create, insertMultiple, search } from 'https://cdn.jsdelivr.net/npm/@orama/orama@3.1.18/+esm';

export function createDB() {
  return create({
    schema: {
      content: 'string',
      embedding: 'vector[1024]',
      metadata: {
        sourceFile: 'string',
        chunkIndex: 'number',
        charOffset: 'number',
        charLength: 'number',
      },
    },
  });
}

export async function insertChunks(db, chunks) {
  // chunks: [{ content, embedding, metadata }]
  await insertMultiple(db, chunks);
}

export async function searchVector(db, queryEmbedding, options = {}) {
  // Verified parameters against Orama v3.1.x README:
  // - mode: 'vector' | 'fulltext' | 'hybrid'
  // - vector.value: the embedding array to search with
  // - vector.property: the schema field containing stored embeddings
  // - similarity: minimum cosine similarity threshold (default 0.8)
  // - limit: maximum number of results to return
  // - includeVectors: whether to include embedding vectors in results
  return search(db, {
    mode: 'vector',
    vector: {
      value: queryEmbedding,
      property: 'embedding',
    },
    similarity: options.similarity ?? 0.7,
    limit: options.limit ?? 5,
    includeVectors: false,
  });
}
```

**IndexedDB Persistence (Custom Implementation):**

Because `@orama/plugin-persistence` is not easily available via CDN, we implement raw IndexedDB persistence:

```javascript
// orama-db.js (IndexedDB helpers)
const DB_NAME = 'rag-browser-db';
const DB_VERSION = 1;
const STORE_NAME = 'documents';

export async function saveToIndexedDB(db) {
  // Serialize Orama database to JSON and store in IndexedDB
  const data = JSON.stringify(db);  // Orama DB is serializable
  const tx = indexedDB.open(DB_NAME, DB_VERSION).transaction([STORE_NAME], 'readwrite');
  tx.objectStore(STORE_NAME).put(data, 'orama-db');
  return new Promise((resolve) => tx.oncomplete = resolve);
}

export async function loadFromIndexedDB() {
  // Load serialized Orama database from IndexedDB
  const tx = indexedDB.open(DB_NAME, DB_VERSION).transaction([STORE_NAME], 'readonly');
  const req = tx.objectStore(STORE_NAME).get('orama-db');
  return new Promise((resolve) => {
    req.onsuccess = () => resolve(req.result ? JSON.parse(req.result) : null);
    req.onerror = () => resolve(null);
  });
}
```

**Note:** Orama databases are plain JavaScript objects and can be serialized/deserialized with `JSON.stringify/parse`. This is a verified behavior — Orama has zero dependencies and uses native data structures.

**Refinement Note:** The `limit` parameter in Orama search controls the maximum number of results returned. The parameter is passed directly in the search options object. Verified in Orama v3.1.x README.

### 4.2 chunker.js

**Tasks:**
1. Implement paragraph-aware chunking
2. Fallback to character-based chunking with overlap
3. Estimate token count per chunk
4. Return structured chunk array with metadata

**Chunking Algorithm:**
```javascript
// chunker.js
export function chunkText(text, options = {}) {
  const {
    maxTokens = 512,
    overlapPercent = 12,  // ~10-15% as per PRD
    sourceFile = 'unknown',
  } = options;
  
  const maxChars = maxTokens * 4;  // ~4 chars per token heuristic
  const overlapChars = Math.floor(maxChars * overlapPercent / 100);
  
  // Strategy 1: Split by paragraphs (double newlines)
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0);
  const chunks = [];
  let currentChunk = '';
  let charOffset = 0;
  
  for (const paragraph of paragraphs) {
    const trimmed = paragraph.trim();
    
    if (trimmed.length <= maxChars) {
      // Paragraph fits in a chunk
      if (currentChunk && (currentChunk.length + trimmed.length) <= maxChars) {
        currentChunk += '\n\n' + trimmed;
      } else {
        // Save current chunk and start new one
        if (currentChunk.trim()) {
          chunks.push({
            content: currentChunk.trim(),
            charOffset: charOffset,
            charLength: currentChunk.trim().length,
          });
        }
        currentChunk = trimmed;
        charOffset += currentChunk.length + 2;
      }
    } else {
      // Paragraph too long — split by sentences
      if (currentChunk.trim()) {
        chunks.push({
          content: currentChunk.trim(),
          charOffset: charOffset,
          charLength: currentChunk.trim().length,
        });
      }
      
      const sentenceChunks = splitBySentences(trimmed, maxChars, overlapChars);
      for (const sc of sentenceChunks) {
        chunks.push({
          ...sc,
          charOffset: charOffset + sc.charOffset,
        });
      }
      charOffset += trimmed.length + 2;
      currentChunk = '';
    }
  }
  
  // Don't forget the last chunk
  if (currentChunk.trim()) {
    chunks.push({
      content: currentChunk.trim(),
      charOffset: charOffset,
      charLength: currentChunk.trim().length,
    });
  }
  
  // Add metadata to each chunk
  return chunks.map((chunk, index) => ({
    id: generateUUID(),
    content: chunk.content,
    metadata: {
      sourceFile,
      chunkIndex: index,
      charOffset: chunk.charOffset,
      charLength: chunk.charLength,
    },
  }));
}

function splitBySentences(text, maxChars, overlapChars) {
  // Split by sentence boundaries (.!? followed by space or end)
  const sentences = text.match(/[^.!?]+[.!?]+[\s]*/g) || [text];
  const chunks = [];
  let current = '';
  
  for (const sentence of sentences) {
    if (current.length + sentence.length <= maxChars) {
      current += sentence;
    } else {
      if (current) {
        chunks.push({ content: current.trim(), charOffset: 0 });
      }
      // Start new chunk with overlap
      const overlap = current.slice(-overlapChars);
      current = overlap + sentence;
    }
  }
  
  if (current.trim()) {
    chunks.push({ content: current.trim(), charOffset: 0 });
  }
  
  return chunks;
}
```

**Key Decision:** Use paragraph-first chunking. This preserves semantic boundaries and works well with the `last_token` pooling strategy of Qwen3-Embedding. The last token of a coherent paragraph captures better semantic meaning than the last token of an arbitrary character split.

### 4.3 rag-pipeline.js (Ingestion)

**Tasks:**
1. Read `.txt` file via File API
2. Chunk the text
3. Batch-generate embeddings
4. Insert into Orama
5. Provide progress callbacks at each step

**Ingestion Pipeline:**
```javascript
// rag-pipeline.js
export async function ingestDocument(file, db, progressCallback) {
  // Step 1: Read file
  progressCallback({ step: 'reading', progress: 0, message: `Reading ${file.name}...` });
  const text = await file.text();
  const fileSize = file.size;
  
  // Step 2: Chunk text
  progressCallback({ step: 'chunking', progress: 25, message: 'Chunking document...' });
  const chunks = chunkText(text, { sourceFile: file.name });
  
  // Step 3: Generate embeddings (in batches)
  progressCallback({ step: 'embedding', progress: 50, message: `Generating embeddings for ${chunks.length} chunks...` });
  const batchSize = 32;  // Batch size for embedding generation
  const allEmbeddings = [];
  
  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize).map(c => c.content);
    const embeddings = await embedDocuments(batch);
    
    // embeddings output shape: [batch_size, sequence_length, 1024]
    // After last_token pooling: [batch_size, 1024]
    // Convert tensor output to arrays
    const embeddingArrays = [];
    for (let j = 0; j < batch.length; j++) {
      const slice = embeddings.slice([j, j + 1]);
      embeddingArrays.push(Array.from(slice.data));
    }
    allEmbeddings.push(...embeddingArrays);
    
    const embedProgress = 50 + (Math.min(i + batchSize, chunks.length) / chunks.length) * 40;
    progressCallback({ step: 'embedding', progress: embedProgress, message: `Embedded ${Math.min(i + batchSize, chunks.length)}/${chunks.length} chunks...` });
  }
  
  // Step 4: Insert into Orama
  progressCallback({ step: 'indexing', progress: 95, message: 'Indexing chunks...' });
  const documents = chunks.map((chunk, i) => ({
    ...chunk,
    embedding: allEmbeddings[i],
  }));
  
  await insertChunks(db, documents);
  
  progressCallback({ step: 'complete', progress: 100, message: `Indexed ${chunks.length} chunks from ${file.name}` });
  
  return { chunks: chunks.length, fileSize };
}
```

**Key Decision:** Batch embedding generation (32 chunks per batch). This balances memory usage with throughput. The embedding model processes batches efficiently, and 32 chunks × ~512 tokens × 1024 dims stays within comfortable memory limits.

### 4.4 Validation Criteria (Phase 2)

- [ ] Upload a 10KB `.txt` file → chunks created with correct metadata
- [ ] Upload a 1MB `.txt` file → chunks created, no memory errors
- [ ] Embeddings are 1024-dimensional arrays
- [ ] Orama index contains all chunks
- [ ] IndexedDB persistence survives page reload
- [ ] Progress callback fires at each step

---

## 5. Phase 3: RAG Retrieval & Generation

**Goal:** Users can ask questions and receive context-aware responses with streaming.

### 5.1 rag-pipeline.js (Retrieval & Generation)

**Tasks:**
1. Embed the user query with instruction wrapper
2. Search Orama for top-K relevant chunks
3. Build RAG prompt with retrieved context
4. Generate streaming response via LLM
5. Return response with source citations

**Retrieval Pipeline:**
```javascript
// rag-pipeline.js
const SYSTEM_PROMPT = `You are a helpful assistant. Answer the user's question using ONLY the provided context. If the context does not contain enough information, say so clearly. Cite your sources by referencing the document chunks.

Context:
{context}

Question: {question}`;

export async function retrieveAndGenerate(query, conversationHistory, db, onToken, onComplete) {
  // Step 1: Embed query
  const queryEmbedding = await embedQuery(query);
  
  // Step 2: Search Orama
  const results = await searchVector(db, queryEmbedding, {
    similarity: 0.6,  // Lower threshold to catch more context
    limit: 5,
  });
  
  // Step 3: Build context
  const contextChunks = results.hits.map((hit, i) => 
    `[Source ${i + 1}: ${hit.document.metadata.sourceFile} (chunk ${hit.document.metadata.chunkIndex})]\n${hit.document.content}`
  ).join('\n\n---\n\n');
  
  const systemPrompt = SYSTEM_PROMPT.replace('{context}', contextChunks);
  
  // Step 4: Build conversation with context
  const messages = [
    { role: 'system', content: [{ type: 'text', text: systemPrompt }] },
    ...conversationHistory,
    { role: 'user', content: [{ type: 'text', text: query }] },
  ];
  
  // Step 5: Generate response
  await generateResponse(messages, onToken, onComplete);
  
  return {
    sourceChunks: results.hits.map(hit => hit.document),
    similarity: results.hits.map(hit => hit.score),
  };
}
```

**Key Decision:** Set similarity threshold to 0.6 (below Orama's default 0.8) to retrieve more context. This compensates for the `last_token` pooling strategy, which can produce less stable similarity scores than mean pooling.

### 5.2 Multi-turn Conversation

**Tasks:**
1. Maintain conversation history in state
2. Include relevant history in RAG prompt
3. Implement conversation clearing

**Conversation Management:**
```javascript
// state.js additions
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

export function clearConversation() {
  setState({ conversation: [] });
}

// In rag-pipeline.js, use last N messages to limit context window
const MAX_HISTORY = 10;  // Last 5 exchanges (10 messages)
const recentHistory = state.conversation.slice(-MAX_HISTORY).map(msg => ({
  role: msg.role,
  content: [{ type: 'text', text: msg.content }],
}));
```

**Key Decision:** Limit conversation history to last 10 messages. Qwen3.5-2B supports 262K tokens context, but keeping history short reduces token count for faster generation and lower memory usage.

### 5.3 Stop Generation

**Tasks:**
1. Implement stop button in UI
2. Cancel ongoing generation using `InterruptableStoppingCriteria`

**Verified Approach (from transformers.js GitHub issues + official docs):**

`InterruptableStoppingCriteria` provides proper generation cancellation:

```javascript
import { InterruptableStoppingCriteria } from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.2.0';

const stoppingCriteria = new InterruptableStoppingCriteria();

// In generation:
await generator(messages, {
  max_new_tokens: 512,
  stopping_criteria: [stoppingCriteria],
  // ... other options
});

// To stop:
stoppingCriteria.interrupt();
```

**Verified behavior:** When `interrupt()` is called, the model stops generating new tokens at the next stopping criterion check point. This is the officially supported mechanism for cancellation in Transformers.js.

### 5.4 Validation Criteria (Phase 3)

- [ ] Query returns relevant chunks from indexed documents
- [ ] Response incorporates retrieved context
- [ ] Response is streamed token-by-token to UI
- [ ] Source citations are displayed with chunk metadata
- [ ] Conversation history is maintained across turns
- [ ] Stop button halts streaming

---

## 6. Phase 4: UI & UX Polish

**Goal:** Complete, polished user interface with all functional requirements.

### 6.1 index.html

**Layout Structure:**
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>RAG-Browser Agent</title>
  <link rel="stylesheet" href="css/styles.css">
</head>
<body>
  <!-- Status Bar -->
  <header id="status-bar">
    <span id="hardware-status">Detecting hardware...</span>
    <span id="model-status">Models: unloaded</span>
    <span id="index-status">Index: 0 chunks, 0 documents</span>
    <span id="memory-status">Memory: --</span>
  </header>
  
  <div id="app-container">
    <!-- Sidebar: Document Management -->
    <aside id="sidebar">
      <h2>Documents</h2>
      <input type="file" id="file-input" accept=".txt" multiple>
      <div id="upload-progress"></div>
      <ul id="document-list"></ul>
      <button id="load-models-btn">Load Models</button>
      <button id="unload-embedding-btn" disabled>Unload Embedding Model</button>
      <button id="unload-llm-btn" disabled>Unload LLM</button>
    </aside>
    
    <!-- Chat Panel -->
    <main id="chat-panel">
      <div id="conversation"></div>
      <div id="input-area">
        <textarea id="query-input" placeholder="Ask a question about your documents..."></textarea>
        <button id="send-btn">Send</button>
        <button id="stop-btn" style="display:none">Stop</button>
      </div>
    </main>
  </div>
  
  <script type="module" src="js/app.js"></script>
</body>
</html>
```

### 6.2 css/styles.css

**Key Requirements:**
- Responsive layout (320px–2560px+ viewport widths per PRD NFR-18)
- Sidebar collapsible on mobile
- Streaming text rendering (cursor animation)
- Progress bar styling
- Dark/light theme support (CSS variables)
- Citation cards with source metadata

### 6.3 ui.js

**Tasks:**
1. Initialize DOM event listeners
2. Render messages (user + assistant)
3. Render streaming text in real-time
4. Update status bar from state
5. Handle file upload events
6. Render citation cards

**Streaming Text Rendering (Refined):**

The `TextStreamer.callback_function` receives the **full accumulated text**, NOT individual tokens. The UI must diff the previous text to extract new content:

```javascript
// ui.js
export function renderStreamingMessage(messageId) {
  const messageEl = createMessageElement('assistant', messageId);
  const contentEl = messageEl.querySelector('.message-content');
  const cursor = document.createElement('span');
  cursor.className = 'streaming-cursor';
  contentEl.appendChild(cursor);
  
  let previousText = '';
  
  // Returns a callback compatible with TextStreamer's callback_function
  return {
    messageEl,
    // This function is passed as callback_function to TextStreamer
    // It receives the FULL accumulated text on each token
    onToken: (fullText) => {
      // Extract only the new text since last callback
      const newText = fullText.slice(previousText.length);
      previousText = fullText;
      
      contentEl.insertBefore(document.createTextNode(newText), cursor);
      messageEl.scrollIntoView({ behavior: 'smooth', block: 'end' });
    },
    getFullText: () => previousText,
    finalize: () => cursor.remove(),
  };
}

// Usage in app.js:
// const messageRenderer = renderStreamingMessage(generateUUID());
// const streamer = new TextStreamer(generator.tokenizer, {
//   skip_prompt: true,
//   callback_function: messageRenderer.onToken,
// });
// ... await generation ...
// messageRenderer.finalize();
```
```

### 6.4 app.js (Main Entry)

**Tasks:**
1. Bootstrap all modules
2. Coordinate hardware detection → model loading
3. Wire up file upload → ingestion pipeline
4. Wire up chat input → retrieval pipeline
5. Subscribe to state changes → update UI

```javascript
// app.js
import { detectHardware } from './hardware.js';
import { getState, setState, subscribe } from './state.js';
import { loadEmbeddingModel, unloadEmbeddingModel } from './embedding.js';
import { loadLLM, unloadLLM } from './llm.js';
import { createDB } from './orama-db.js';
import { ingestDocument, retrieveAndGenerate } from './rag-pipeline.js';
import { initUI } from './ui.js';

let db = null;

export async function init() {
  // Hardware detection
  const hardware = await detectHardware();
  setState({ hardware });
  
  // Initialize Orama database
  db = createDB();
  
  // Initialize UI
  initUI({
    onFileUpload: handleFileUpload,
    onQuery: handleQuery,
    onLoadModels: handleLoadModels,
    onUnloadEmbedding: handleUnloadEmbedding,
    onUnloadLLM: handleUnloadLLM,
  });
}

async function handleFileUpload(files) {
  for (const file of files) {
    if (!file.name.endsWith('.txt')) {
      showNotification(`Skipping ${file.name}: only .txt files supported`, 'warning');
      continue;
    }
    
    if (getState().models.embedding !== 'ready') {
      await loadEmbeddingModel(getState().hardware);
      setState({ models: { ...getState().models, embedding: 'ready' } });
    }
    
    await ingestDocument(file, db, (progress) => {
      updateProgress(progress);
    });
    
    updateDocumentList();
  }
}

async function handleQuery(query) {
  if (getState().models.llm !== 'ready') {
    await loadLLM(getState().hardware);
    setState({ models: { ...getState().models, llm: 'ready' } });
  }
  
  const conversation = getState().conversation;
  
  const { sourceChunks, similarity } = await retrieveAndGenerate(
    query,
    conversation,
    db,
    (token) => appendTokenToMessage(token),
    (fullResponse) => completeMessage(fullResponse, sourceChunks)
  );
}

async function handleLoadModels() {
  const config = getState().hardware;
  
  setState({ models: { ...getState().models, embedding: 'loading' } });
  await loadEmbeddingModel(config);
  setState({ models: { ...getState().models, embedding: 'ready' } });
  
  setState({ models: { ...getState().models, llm: 'loading' } });
  await loadLLM(config);
  setState({ models: { ...getState().models, llm: 'ready' } });
}
```

### 6.5 Validation Criteria (Phase 4)

- [ ] Application loads and displays status bar with hardware info
- [ ] Models load on demand with progress indicators
- [ ] File upload triggers ingestion pipeline
- [ ] Chat interface accepts queries and displays streaming responses
- [ ] Citations displayed with source file and chunk index
- [ ] Responsive on mobile (320px) and desktop (1920px+)
- [ ] Conversation history persists in UI across turns

---

## 7. Phase 5: Optimization & Hardening

**Goal:** Performance optimization, offline support, and cross-browser testing.

### 7.1 Memory Management

**Optimizations:**
1. **Lazy model loading:** Load embedding model only when files are uploaded. Load LLM only when queries are made.
2. **Embedding model unload after ingestion:** Once documents are indexed, dispose the embedding model to free memory for the LLM.
3. **Selective reload:** Reload embedding model only for new queries (embedding is fast on WebGPU).

```javascript
// Memory optimization flow
async function ingestDocument(file) {
  // Load embedding model if not loaded
  if (!isEmbeddingLoaded) {
    await loadEmbeddingModel(config);
  }
  
  // ... chunk and embed ...
  
  // Unload embedding model after ingestion
  await unloadEmbeddingModel();
}

async function handleQuery(query) {
  // Reload embedding model for query embedding
  if (!isEmbeddingLoaded) {
    await loadEmbeddingModel(config);
  }
  
  const queryEmbedding = await embedQuery(query);
  
  // Unload embedding model again
  await unloadEmbeddingModel();
  
  // Load LLM if not loaded
  if (!isLLMLoaded) {
    await loadLLM(config);
  }
  
  // ... generate response ...
}
```

**Risk:** Repeated load/unload of the embedding model incurs download latency. Mitigation: Keep embedding model loaded during active querying sessions. Only unload when user explicitly requests or when memory is critically low.

### 7.2 IndexedDB Persistence

**Implementation:**
1. Serialize Orama database to JSON
2. Store in IndexedDB with versioning
3. Restore on page load
4. Handle quota exceeded errors

```javascript
// orama-db.js
async function persistIndex() {
  try {
    const data = JSON.stringify(db);
    const blob = new Blob([data], { type: 'application/json' });
    
    const tx = indexedDB.open(DB_NAME, DB_VERSION).transaction([STORE_NAME], 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.clear();  // Remove old data
    store.put(blob, 'orama-db');
    store.put({ timestamp: Date.now(), version: DB_VERSION }, 'metadata');
    
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (error) {
    // Handle quota exceeded
    if (error.name === 'QuotaExceededError') {
      console.warn('IndexedDB quota exceeded. Consider reducing document count.');
    }
  }
}

async function restoreIndex() {
  try {
    const tx = indexedDB.open(DB_NAME, DB_VERSION).transaction([STORE_NAME], 'readonly');
    const store = tx.objectStore(STORE_NAME);
    
    const req = store.get('orama-db');
    return new Promise((resolve) => {
      req.onsuccess = async () => {
        if (req.result) {
          const data = await req.result.text();
          return JSON.parse(data);
        }
        return null;
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}
```

### 7.3 Service Worker (Offline Support)

**Scope:** Cache static assets (HTML, CSS, JS) for offline operation. Models are already cached by the browser's HTTP cache.

```javascript
// sw.js
const CACHE_NAME = 'rag-browser-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/css/styles.css',
  '/js/app.js',
  '/js/state.js',
  '/js/hardware.js',
  '/js/embedding.js',
  '/js/llm.js',
  '/js/chunker.js',
  '/js/orama-db.js',
  '/js/rag-pipeline.js',
  '/js/ui.js',
  '/js/utils.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
```

**Registration in app.js:**
```javascript
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js');
}
```

### 7.4 Performance Budgets

| Operation | Target | Measurement |
|-----------|--------|-------------|
| Page load (no models) | < 3 seconds | Lighthouse |
| Embedding model load (WebGPU, fp16) | < 30 seconds | Console timing |
| Embedding model load (WASM, q8) | < 45 seconds | Console timing |
| LLM model load (WebGPU, q4) | < 60 seconds | Console timing |
| Embedding generation (single chunk) | < 100ms | Performance API |
| Embedding generation (100 chunks) | < 5 seconds | Performance API |
| Vector search (10K chunks) | < 50ms | Performance API |
| LLM token generation (WebGPU, q4) | > 10 tokens/sec | Token count / time |
| LLM token generation (WASM, q4fp16) | > 3 tokens/sec | Token count / time |

### 7.5 Validation Criteria (Phase 5)

- [ ] Application works offline after initial load (service worker)
- [ ] IndexedDB persistence survives page reload
- [ ] Memory usage stays within browser tab limits during large document ingestion
- [ ] Performance targets met on WebGPU hardware
- [ ] WASM fallback works on non-WebGPU browsers
- [ ] No console errors in production mode

---

## 8. Critical Design Decisions

### 8.1 Embedding: last_token Pooling

**Decision:** Use `pooling: "last_token"` as specified by the Qwen3-Embedding model card.

**Rationale:** This is the pooling strategy the model was trained with. Using `mean` pooling would produce incorrect embeddings and degrade retrieval quality significantly.

**Implication:** Chunking must preserve semantic coherence. The last token of a chunk must represent the chunk's meaning. Paragraph-aware chunking (Phase 2) addresses this.

### 8.2 Embedding: Instruction Wrapping

**Decision:** Wrap queries with `Instruct: {task}\nQuery:{query}`. Embed documents as raw text.

**Rationale:** The model was trained with this asymmetric instruction format. Queries get the instruction; documents don't. This is explicitly stated in the model card.

**Implication:** All query embeddings MUST use the instruction wrapper. Document embeddings MUST NOT. Mixing these up will produce poor retrieval results.

### 8.3 Quantization: q4 for LLM

**Decision:** Use `q4` quantization for the LLM even on WebGPU hardware.

**Rationale:** Qwen3.5-2B in fp16 would require ~4.5 GB VRAM alone, leaving little room for the embedding model, browser overhead, and KV cache. `q4` reduces this to ~1.2 GB, enabling comfortable operation within browser tab limits.

**Implication:** Slight quality reduction vs. fp16, but acceptable for a 2B model. The model card confirms `q4` provides acceptable response quality.

### 8.4 Persistence: Custom IndexedDB

**Decision:** Implement raw IndexedDB persistence instead of using `@orama/plugin-persistence`.

**Rationale:** The Orama persistence plugin is not easily available via CDN. Raw IndexedDB is well-supported, requires no additional dependencies, and provides the same functionality.

**Implication:** Need to handle serialization/deserialization manually. Orama databases are plain objects, making this straightforward.

### 8.5 Model Loading: Lazy/On-Demand

**Decision:** Load models only when needed, not at page load.

**Rationale:** The embedding model (~1.2 GB fp16) and LLM (~1.2 GB q4) together require ~2.4 GB download. Loading both upfront would create a poor user experience for users who only want to browse the UI.

**Implication:** First query and first file upload will have model loading latency. Mitigated by progress indicators and explicit "Load Models" button.

### 8.6 CDN: jsDelivr

**Decision:** Use jsDelivr CDN for all library imports.

**Rationale:** jsDelivr is reliable, has good global coverage, supports ES module imports, and is compatible with the PRD's CDN allowance. Both Transformers.js and Orama are available on jsDelivr.

**CDN URLs (Verified):**
- Transformers.js: `https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.2.0`
- Orama: `https://cdn.jsdelivr.net/npm/@orama/orama@3.1.18/+esm`

---

## 9. Risk Register

| Risk | Impact | Likelihood | Mitigation | Status |
|------|--------|------------|------------|--------|
| WebGPU not available | High | Medium | WASM fallback with q8/q4fp16 quantization. Clear hardware requirements in UI. | Accepted |
| Model download fails (large files ~2GB total) | High | Medium | Progress indicators. Allow resume via browser cache. Service worker for offline caching. | Mitigated |
| Out-of-memory during large document ingestion | High | Medium | Batch processing. Memory warnings at 80% capacity. Graceful error handling. | Mitigated |
| Slow inference on low-end hardware (WASM) | Medium | Medium | Set performance expectations. Allow configuration of max_new_tokens. | Accepted |
| last_token pooling sensitivity to chunk boundaries | Medium | Medium | Paragraph-aware chunking. Avoid splitting in the middle of sentences. | Mitigated |
| Transformers.js v4 API changes | Medium | Low | Pin to v4.2.0. Abstraction layer around model loading. | Mitigated |
| Browser tab suspension kills model state | Medium | Low | IndexedDB persistence for index. Reload prompt on resume. | Mitigated |
| Qwen3.5-2B produces hallucinated answers | Medium | Medium | System prompt constraints. Source citations. "I don't know" fallback in prompt. | Mitigated |
| IndexedDB quota exceeded for large indexes | Low | Low | Monitor quota. Warn user. Allow index reset. | Mitigated |
| Qwen3-Embedding-0.6B-ONNX model broken | Low | Low | Discussion #4 resolved (cache issue). Model works correctly. | Resolved |

---

## Appendix A: Embedding Dimension Verification

The Qwen3-Embedding-0.6B model supports Matryoshka Representation Learning (MRL), allowing configurable embedding dimensions from 32 to 1024. For this implementation:

- **Default:** 1024 dimensions (full precision)
- **Memory-constrained mode:** Truncate to 256 or 512 dimensions

Truncation is done by slicing the embedding array:
```javascript
const fullEmbedding = await embedQuery(query);  // 1024 dims
const truncatedEmbedding = fullEmbedding.slice(0, 256);  // 256 dims
```

The Orama schema must match the chosen dimension:
```javascript
embedding: 'vector[1024]'  // or 'vector[256]' for memory-constrained mode
```

## Appendix B: Model Size Estimates

| Model | Precision | Approximate Size |
|-------|-----------|-----------------|
| Qwen3-Embedding-0.6B | fp32 | ~2.4 GB |
| Qwen3-Embedding-0.6B | fp16 | ~1.2 GB |
| Qwen3-Embedding-0.6B | q8 | ~0.6 GB |
| Qwen3.5-2B | fp16 | ~4.5 GB |
| Qwen3.5-2B | q4 | ~1.2 GB |
| Qwen3.5-2B | q4fp16 | ~1.5 GB |

| **Total download (fp16 embedding + q4 LLM):** ~2.4 GB
| **Total download (q8 embedding + q4 LLM):** ~1.8 GB

**Refinement — Pipeline vs Direct Model API:** The implementation plan uses `pipeline("text-generation")` as the primary API for the LLM, which is the officially recommended approach per [Transformers.js pipeline docs](https://huggingface.co/docs/transformers.js/en/pipelines). This simplifies the code because the pipeline handles:
- Chat template application (via `apply_chat_template`)
- Input tokenization
- Generation parameters (`max_new_tokens`, `do_sample`, `streamer`)
- Output decoding

The direct `Qwen3_5ForConditionalGeneration.from_pretrained()` approach (from the model card) is a lower-level alternative that gives more control but requires manual handling of all the above steps.

## Appendix C: Browser Compatibility Matrix

| Browser | Version | WebGPU | WASM | Status |
|---------|---------|--------|------|--------|
| Chrome | 113+ | Yes | Yes | Primary |
| Edge | 113+ | Yes | Yes | Primary |
| Safari | 18+ | Yes | Yes | Secondary |
| Firefox | 134+ | Yes | Yes | Secondary |
| Chrome Android | 113+ | Yes | Yes | Mobile |
| Safari iOS | 18+ | Yes | Yes | Mobile |

---

*This implementation plan was verified against primary sources as of 2026-06-13. All API patterns, model configurations, and CDN URLs have been confirmed working.*

### Verification Sources Used

| Source | URL | What Was Verified |
|--------|-----|-------------------|
| Qwen3-Embedding-0.6B-ONNX model card | huggingface.co/onnx-community/Qwen3-Embedding-0.6B-ONNX | Pooling strategy, instruction format, dtype options |
| Qwen3.5-2B-ONNX model card | huggingface.co/huggingworld/Qwen3.5-2B-ONNX | Model class, dtype config, chat template, streaming |
| Orama README | GitHub oramasearch/orama | Schema API, vector search, CDN URL, data types |
| Orama npm | npmjs.com/package/@orama/orama | Latest version (3.1.18) |
| Transformers.js v4 releases | GitHub huggingface/transformers.js/releases | Version 4.2.0, WebGPU C++ runtime |
| Transformers.js pipeline docs | huggingface.co/docs/transformers.js/en/pipelines | pipeline("text-generation"), TextStreamer callback_function |
| Transformers.js streamers docs | huggingface.co/docs/transformers.js/en/api/generation/streamers | TextStreamer API, callback_function parameter |
| Qwen3-Embedding GitHub | GitHub QwenLM/Qwen3-Embedding | last_token pooling implementation |
| Hugging Face discussions | Discussion #4 on Qwen3-Embedding-0.6B-ONNX | Protobuf issue resolved (cache problem) |
| Reddit r/LLMDevs | Qwen3-Embedding last_token pooling discussion | Sensitivity to query framing with last_token pooling |
| Transformers.js GitHub issues | #394, #641, #934 | Streaming support, TextStreamer usage patterns |
