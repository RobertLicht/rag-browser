// ui.js — UI rendering, DOM manipulation, event handling

import { generateUUID } from "./utils.js";
import { renderMarkdown, renderLaTeX } from "./renderer.js";
import { setSearchConfig, resetSearchConfig, getState } from "./state.js";

/**
 * Initialize all UI event listeners and render the initial state.
 * @param {Object} callbacks - Object of event handler callbacks
 */
export function initUI(callbacks) {
  // DOM references
  const fileInput = document.getElementById("file-input");
  const sendBtn = document.getElementById("send-btn");
  const stopBtn = document.getElementById("stop-btn");
  const queryInput = document.getElementById("query-input");
  const loadModelsBtn = document.getElementById("load-models-btn");
  const unloadEmbeddingBtn = document.getElementById("unload-embedding-btn");
  const unloadLlmBtn = document.getElementById("unload-llm-btn");
  const clearChatBtn = document.getElementById("clear-chat-btn");

  // Disable file input until models are loaded
  fileInput.disabled = true;

  // File upload
  fileInput.addEventListener("change", (e) => {
    if (e.target.files.length > 0 && callbacks.onFileUpload) {
      callbacks.onFileUpload(Array.from(e.target.files));
    }
  });

  // Send message
  sendBtn.addEventListener("click", () => {
    const query = queryInput.value.trim();
    if (query && callbacks.onQuery) {
      queryInput.value = "";
      callbacks.onQuery(query);
    }
  });

  // Send on Enter (Shift+Enter for new line)
  queryInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendBtn.click();
    }
  });

  // Stop generation
  stopBtn.addEventListener("click", () => {
    if (callbacks.onStop) {
      callbacks.onStop();
    }
  });

  // Load models
  loadModelsBtn.addEventListener("click", () => {
    if (callbacks.onLoadModels) {
      callbacks.onLoadModels();
    }
  });

  // Unload embedding model
  unloadEmbeddingBtn.addEventListener("click", () => {
    if (callbacks.onUnloadEmbedding) {
      callbacks.onUnloadEmbedding();
    }
  });

  // Unload LLM
  unloadLlmBtn.addEventListener("click", () => {
    if (callbacks.onUnloadLLM) {
      callbacks.onUnloadLLM();
    }
  });

  // Clear chat
  clearChatBtn.addEventListener("click", () => {
    if (callbacks.onClearChat) {
      callbacks.onClearChat();
    }
  });

  // Export database
  const exportDbBtn = document.getElementById("export-db-btn");
  if (exportDbBtn) {
    exportDbBtn.addEventListener("click", () => {
      if (callbacks.onExportDB) {
        callbacks.onExportDB();
      }
    });
  }

  // Import database — visible button triggers hidden file input
  const importDbBtn = document.getElementById("import-db-btn");
  const importDbInput = document.getElementById("import-db-input");
  if (importDbBtn && importDbInput) {
    importDbBtn.addEventListener("click", () => {
      importDbInput.click();
    });
    importDbInput.addEventListener("change", (e) => {
      if (e.target.files.length > 0 && callbacks.onImportDB) {
        callbacks.onImportDB(e.target.files[0]);
        // Reset so re-importing same file triggers change
        e.target.value = "";
      }
    });
  }

  // Initialize search settings panel
  initSearchSettings({ onReset: callbacks.onResetSearchConfig });

  return { sendBtn, stopBtn, queryInput };
}

/**
 * Update the status bar with current state.
 */
export function updateStatusBar(state) {
  const hwStatus = document.getElementById("hardware-status");
  const modelStatus = document.getElementById("model-status");
  const indexStatus = document.getElementById("index-status");
  const memoryStatus = document.getElementById("memory-status");

  // Hardware status
  const hwClass = state.hardware.webgpuAvailable ? "active" : "warning";
  hwStatus.innerHTML = `<span class="status-dot ${hwClass}"></span> ${state.hardware.device.toUpperCase()}`;

  // Model status
  const embState = state.models.embedding;
  const llmState = state.models.llm;
  modelStatus.innerHTML = `Embedding: ${embState} | LLM: ${llmState}`;

  // Index status
  indexStatus.textContent = `Index: ${state.index.totalChunks} chunks, ${state.index.totalDocuments} documents`;

  // Memory status (if performance API available)
  if (performance.memory) {
    const usedMB = (performance.memory.usedJSHeapSize / 1048576).toFixed(1);
    const limitMB = (performance.memory.jsHeapSizeLimit / 1048576).toFixed(0);
    memoryStatus.textContent = `Memory: ${usedMB} MB / ${limitMB} MB`;
  }
}

/**
 * Render a user message in the conversation.
 * @param {string} text - The user's message text
 */
export function renderUserMessage(text) {
  const conversation = document.getElementById("conversation");
  const el = document.createElement("div");
  el.className = "message message-user";
  el.textContent = text;
  conversation.appendChild(el);
  scrollConversation();
}

/**
 * Render an assistant message in the conversation.
 * @param {string} text - The assistant's response text
 * @param {Array} sourceChunks - Optional source citation chunks
 * @param {Array} similarities - Optional similarity scores
 */
export function renderAssistantMessage(
  text,
  sourceChunks = null,
  similarities = null,
) {
  const conversation = document.getElementById("conversation");
  const el = document.createElement("div");
  el.className = "message message-assistant";

  const contentEl = document.createElement("div");
  contentEl.className = "message-content";
  contentEl.innerHTML = renderMarkdown(text);
  renderLaTeX(contentEl);
  el.appendChild(contentEl);

  // Add citations if available
  if (sourceChunks && sourceChunks.length > 0) {
    const citationsEl = document.createElement("div");
    citationsEl.className = "citations";

    sourceChunks.forEach((chunk, i) => {
      const card = document.createElement("div");
      card.className = "citation-card";

      const source = document.createElement("div");
      source.className = "citation-source";
      source.textContent = `${chunk.metadata.sourceFile} (chunk ${chunk.metadata.chunkIndex})`;

      const preview = document.createElement("div");
      preview.className = "citation-text";
      preview.textContent =
        chunk.content.slice(0, 200) + (chunk.content.length > 200 ? "..." : "");

      const sim = document.createElement("div");
      sim.className = "citation-similarity";
      sim.textContent = `Similarity: ${(similarities[i] * 100).toFixed(1)}%`;

      card.appendChild(source);
      card.appendChild(preview);
      card.appendChild(sim);
      citationsEl.appendChild(card);
    });

    el.appendChild(citationsEl);
  }

  conversation.appendChild(el);
  scrollConversation();
}

/**
 * Create a streaming message element and return a controller object.
 *
 * The onToken callback receives the FULL accumulated text after generation
 * completes, so we diff against the previous value to extract new content.
 *
 * @returns {Object} Controller with onToken, finalize, and messageEl
 */
export function renderStreamingMessage() {
  const conversation = document.getElementById("conversation");
  const el = document.createElement("div");
  el.className = "message message-assistant";

  const contentEl = document.createElement("div");
  contentEl.className = "message-content";

  const cursor = document.createElement("span");
  cursor.className = "streaming-cursor";
  contentEl.appendChild(cursor);

  el.appendChild(contentEl);
  conversation.appendChild(el);
  scrollConversation();

  let previousText = "";
  let thinkingNode = null; // tracks the "Thinking..." text node
  let renderTimeout = null; // debounces markdown re-rendering during streaming

  return {
    messageEl: el,
    // Show "Thinking..." loading state during model generation
    showThinking: () => {
      thinkingNode = document.createTextNode("Thinking...");
      contentEl.insertBefore(thinkingNode, cursor);
      scrollConversation();
    },
    // Called with the final FULL accumulated text after generation completes.
    // Previously called per-token during streaming; now called once with full text.
    onToken: (fullText) => {
      // Clear the "Thinking..." placeholder before showing actual response
      if (thinkingNode && thinkingNode.parentNode) {
        thinkingNode.parentNode.removeChild(thinkingNode);
        thinkingNode = null;
      }

      previousText = fullText;

      // Debounce re-rendering: wait for a brief pause in streaming
      if (renderTimeout) clearTimeout(renderTimeout);
      renderTimeout = setTimeout(() => {
        // Re-render the content area with updated markdown, keeping the cursor
        // Remove all children except cursor
        while (contentEl.firstChild && contentEl.firstChild !== cursor) {
          contentEl.removeChild(contentEl.firstChild);
        }
        contentEl.innerHTML = renderMarkdown(previousText);
        contentEl.appendChild(cursor);
        scrollConversation();
      }, 80);
    },
    getFullText: () => previousText,
    // Remove cursor, clear thinking placeholder, render final markdown+LaTeX, and optionally add citations
    finalize: (sourceChunks = null, similarities = null) => {
      // Clear any pending render timeout
      if (renderTimeout) {
        clearTimeout(renderTimeout);
        renderTimeout = null;
      }

      // Always clear the thinking placeholder (in case onToken was never called)
      if (thinkingNode && thinkingNode.parentNode) {
        thinkingNode.parentNode.removeChild(thinkingNode);
        thinkingNode = null;
      }
      cursor.remove();

      // Final render: markdown + LaTeX
      contentEl.innerHTML = renderMarkdown(previousText);
      renderLaTeX(contentEl);

      // Add citations if available
      if (sourceChunks && sourceChunks.length > 0) {
        const citationsEl = document.createElement("div");
        citationsEl.className = "citations";

        sourceChunks.forEach((chunk, i) => {
          const card = document.createElement("div");
          card.className = "citation-card";

          const source = document.createElement("div");
          source.className = "citation-source";
          source.textContent = `${chunk.metadata.sourceFile} (chunk ${chunk.metadata.chunkIndex})`;

          const preview = document.createElement("div");
          preview.className = "citation-text";
          preview.textContent =
            chunk.content.slice(0, 200) +
            (chunk.content.length > 200 ? "..." : "");

          const sim = document.createElement("div");
          sim.className = "citation-similarity";
          sim.textContent = `Similarity: ${(similarities[i] * 100).toFixed(1)}%`;

          card.appendChild(source);
          card.appendChild(preview);
          card.appendChild(sim);
          citationsEl.appendChild(card);
        });

        el.appendChild(citationsEl);
      }
    },
  };
}

/**
 * Update the upload progress indicator.
 * @param {Object} progress - { step, progress (0-100), message }
 */
export function updateProgress(progress) {
  const progressEl = document.getElementById("upload-progress");
  if (!progressEl) return;

  if (progress.step === "complete") {
    progressEl.innerHTML = `<div style="color: var(--success)">${progress.message}</div>`;
    // Clear after 3 seconds
    setTimeout(() => {
      if (progressEl.textContent === progress.message) {
        progressEl.innerHTML = "";
      }
    }, 3000);
    return;
  }

  progressEl.innerHTML = `
    <div>${progress.message}</div>
    <div class="progress-bar">
      <div class="progress-fill" style="width: ${progress.progress}%"></div>
    </div>
  `;
}

/**
 * Update the document list in the sidebar.
 * @param {Array} documents - Array of { name, chunks, size }
 */
export function updateDocumentList(documents) {
  const list = document.getElementById("document-list");
  list.innerHTML = "";

  documents.forEach((doc) => {
    const li = document.createElement("li");

    const nameSpan = document.createElement("span");
    nameSpan.className = "doc-name";
    nameSpan.textContent = doc.name;

    const chunksSpan = document.createElement("span");
    chunksSpan.className = "doc-chunks";
    chunksSpan.textContent = `${doc.chunks} chunks`;

    li.appendChild(nameSpan);
    li.appendChild(chunksSpan);
    list.appendChild(li);
  });
}

/**
 * Show a temporary notification.
 * @param {string} message
 * @param {'info'|'warning'|'error'} type
 */
export function showNotification(message, type = "info") {
  const el = document.createElement("div");
  el.style.cssText = `
    position: fixed;
    bottom: 1rem;
    right: 1rem;
    padding: 0.75rem 1rem;
    background: ${type === "error" ? "var(--error)" : type === "warning" ? "var(--warning)" : "var(--accent)"};
    color: white;
    border-radius: 8px;
    font-size: 0.85rem;
    z-index: 1000;
    max-width: 300px;
    animation: slideIn 0.3s ease;
  `;
  el.textContent = message;
  document.body.appendChild(el);

  setTimeout(() => {
    el.style.opacity = "0";
    el.style.transition = "opacity 0.3s";
    setTimeout(() => el.remove(), 300);
  }, 3000);
}

/**
 * Scroll the conversation to the bottom.
 */
function scrollConversation() {
  const conversation = document.getElementById("conversation");
  if (conversation) {
    conversation.scrollTop = conversation.scrollHeight;
  }
}

/**
 * Show the model loading modal.
 */
export function showLoadingModal() {
  const modal = document.getElementById("loading-modal");
  modal.style.display = "flex";

  // Reset step states
  const stepEmbedding = document.getElementById("step-embedding");
  const stepLlm = document.getElementById("step-llm");
  stepEmbedding.className = "modal-step";
  stepEmbedding.querySelector(".step-icon").textContent = "●";
  document.getElementById("step-embedding-progress").textContent = "";
  stepLlm.className = "modal-step";
  stepLlm.querySelector(".step-icon").textContent = "●";
  document.getElementById("step-llm-progress").textContent = "";

  document.getElementById("modal-progress-fill").style.width = "0%";
  document.getElementById("modal-total-progress").textContent = "";
  document.getElementById("modal-title").textContent = "Loading Models";
  document.getElementById("modal-description").textContent =
    "Downloading and initializing AI models...";
}

/**
 * Hide the model loading modal.
 */
export function hideLoadingModal() {
  const modal = document.getElementById("loading-modal");
  modal.style.display = "none";
}

/**
 * Update the loading modal with current step progress.
 * @param {'embedding'|'llm'} step - Which step is currently active
 * @param {number} progress - 0-100 percentage
 * @param {string} [status] - 'download' | 'init' | 'ready'
 * @param {string} [file] - Current file name being processed
 */
export function updateLoadingModal(step, progress, status, file) {
  const stepEmbedding = document.getElementById("step-embedding");
  const stepLlm = document.getElementById("step-llm");
  const progressFill = document.getElementById("modal-progress-fill");
  const totalProgress = document.getElementById("modal-total-progress");

  // Mark completed steps
  if (step === "llm") {
    stepEmbedding.className = "modal-step done";
    stepEmbedding.querySelector(".step-icon").textContent = "✓";
    document.getElementById("step-embedding-progress").textContent = "done";
  }

  // Update current step
  const currentStep = step === "embedding" ? stepEmbedding : stepLlm;
  const currentProgress =
    step === "embedding"
      ? document.getElementById("step-embedding-progress")
      : document.getElementById("step-llm-progress");

  currentStep.className = "modal-step active";
  currentStep.querySelector(".step-icon").textContent = "●";

  // Show file name if available, otherwise percentage
  if (file && status === "download") {
    currentProgress.textContent = file;
  } else if (status === "ready") {
    currentProgress.textContent = "ready";
  } else if (status === "init") {
    currentProgress.textContent = "initializing";
  } else {
    currentProgress.textContent = `${Math.round(progress)}%`;
  }

  // Update overall progress bar (each model is ~50% of total)
  const modelProgress = Math.min(progress, 100);
  let overallProgress;
  if (step === "embedding") {
    overallProgress = (modelProgress / 100) * 50;
  } else {
    overallProgress = 50 + (modelProgress / 100) * 50;
  }
  progressFill.style.width = `${overallProgress}%`;
  totalProgress.textContent = `Overall: ${Math.round(overallProgress)}%`;
}

/**
 * Enable or disable the file input based on model loading state.
 * Both embedding and LLM must be 'ready' to enable uploads.
 * @param {boolean} enabled
 */
export function setFileInputEnabled(enabled) {
  const fileInput = document.getElementById("file-input");
  fileInput.disabled = !enabled;
}

/**
 * Enable or disable the unload buttons based on model loading state.
 * A button is enabled only when its corresponding model is loaded.
 * @param {boolean} embeddingLoaded - Whether the embedding model is loaded
 * @param {boolean} llmLoaded - Whether the LLM is loaded
 */
export function setUnloadButtonStates(embeddingLoaded, llmLoaded) {
  const unloadEmbeddingBtn = document.getElementById("unload-embedding-btn");
  const unloadLlmBtn = document.getElementById("unload-llm-btn");
  unloadEmbeddingBtn.disabled = !embeddingLoaded;
  unloadLlmBtn.disabled = !llmLoaded;
}

/**
 * Sync UI controls to match current search config state.
 * Called after a reset so sliders/dropdowns reflect the new values.
 */
export function syncSettingsUI() {
  const { searchConfig } = getState();

  // Mode selector
  const modeSelect = document.getElementById("search-mode-select");
  if (modeSelect) modeSelect.value = searchConfig.mode;

  // Hybrid weights slider
  const textSlider = document.getElementById("text-weight-slider");
  const textWeightLabel = document.getElementById("text-weight-label");
  const vectorWeightLabel = document.getElementById("vector-weight-label");
  if (textSlider) {
    const tw = Math.round(searchConfig.hybridWeights.text * 100);
    textSlider.value = tw;
    if (textWeightLabel) textWeightLabel.textContent = `BM25: ${tw}%`;
    if (vectorWeightLabel)
      vectorWeightLabel.textContent = `Vector: ${100 - tw}%`;
  }

  // Hybrid similarity threshold
  const hybridSimSlider = document.getElementById("hybrid-similarity-slider");
  const hybridSimValue = document.getElementById("hybrid-similarity-value");
  if (hybridSimSlider) {
    const val = Math.round(searchConfig.thresholds.hybridSimilarity * 100);
    hybridSimSlider.value = val;
    if (hybridSimValue) hybridSimValue.textContent = `${val}%`;
  }

  // Min vector similarity gate
  const minVecSlider = document.getElementById("min-vector-slider");
  const minVecValue = document.getElementById("min-vector-value");
  if (minVecSlider) {
    const val = Math.round(searchConfig.thresholds.minVectorSimilarity * 100);
    minVecSlider.value = val;
    if (minVecValue) minVecValue.textContent = `${val}%`;
  }

  // Vector similarity threshold
  const vecSimSlider = document.getElementById("vector-similarity-slider");
  const vecSimValue = document.getElementById("vector-similarity-value");
  if (vecSimSlider) {
    const val = Math.round(searchConfig.thresholds.vectorSimilarity * 100);
    vecSimSlider.value = val;
    if (vecSimValue) vecSimValue.textContent = `${val}%`;
  }

  // Top-N slider
  const topNSlider = document.getElementById("top-n-slider");
  const topNValue = document.getElementById("top-n-value");
  if (topNSlider) {
    topNSlider.value = searchConfig.topN;
    if (topNValue) topNValue.textContent = `${searchConfig.topN}`;
  }

  // Update visibility based on mode
  const hybridSettings = document.getElementById("hybrid-settings");
  const hybridThresholds = document.getElementById("hybrid-thresholds");
  const vectorThreshold = document.getElementById("vector-threshold");
  const isHybrid = searchConfig.mode === "hybrid";
  if (hybridSettings)
    hybridSettings.style.display = isHybrid ? "block" : "none";
  if (hybridThresholds)
    hybridThresholds.style.display = isHybrid ? "block" : "none";
  if (vectorThreshold)
    vectorThreshold.style.display = isHybrid ? "none" : "block";
}

/**
 * Initialize search settings panel controls.
 * Wires up all sliders, dropdowns, and the reset button to update
 * search configuration via state management.
 *
 * @param {Object} options - Options object
 * @param {Function} options.onReset - Callback when reset button is clicked
 */
export function initSearchSettings({ onReset }) {
  // DOM references
  const modeSelect = document.getElementById("search-mode-select");
  const textSlider = document.getElementById("text-weight-slider");
  const textWeightLabel = document.getElementById("text-weight-label");
  const vectorWeightLabel = document.getElementById("vector-weight-label");
  const hybridSettings = document.getElementById("hybrid-settings");
  const hybridThresholds = document.getElementById("hybrid-thresholds");
  const vectorThreshold = document.getElementById("vector-threshold");
  const resetBtn = document.getElementById("reset-settings-btn");

  // Helper: show/hide controls based on search mode
  function updateVisibility(mode) {
    const isHybrid = mode === "hybrid";
    if (hybridSettings)
      hybridSettings.style.display = isHybrid ? "block" : "none";
    if (hybridThresholds)
      hybridThresholds.style.display = isHybrid ? "block" : "none";
    if (vectorThreshold)
      vectorThreshold.style.display = isHybrid ? "none" : "block";
  }

  // ─── Mode Selector ──────────────────────────────────────────
  if (modeSelect) {
    modeSelect.addEventListener("change", (e) => {
      setSearchConfig({ mode: e.target.value });
      updateVisibility(e.target.value);
    });
  }

  // ─── BM25/Vector Weight Slider ──────────────────────────────
  if (textSlider) {
    textSlider.addEventListener("input", (e) => {
      const textWeight = parseInt(e.target.value);
      const vectorWeight = 100 - textWeight;
      if (textWeightLabel) textWeightLabel.textContent = `BM25: ${textWeight}%`;
      if (vectorWeightLabel)
        vectorWeightLabel.textContent = `Vector: ${vectorWeight}%`;

      setSearchConfig({
        hybridWeights: {
          text: textWeight / 100,
          vector: vectorWeight / 100,
        },
      });
    });
  }

  // ─── Hybrid Similarity Threshold ────────────────────────────
  const hybridSimSlider = document.getElementById("hybrid-similarity-slider");
  const hybridSimValue = document.getElementById("hybrid-similarity-value");
  if (hybridSimSlider) {
    hybridSimSlider.addEventListener("input", (e) => {
      const val = parseInt(e.target.value);
      if (hybridSimValue) hybridSimValue.textContent = `${val}%`;
      setSearchConfig({
        thresholds: { hybridSimilarity: val / 100 },
      });
    });
  }

  // ─── Min Vector Similarity Gate ─────────────────────────────
  const minVecSlider = document.getElementById("min-vector-slider");
  const minVecValue = document.getElementById("min-vector-value");
  if (minVecSlider) {
    minVecSlider.addEventListener("input", (e) => {
      const val = parseInt(e.target.value);
      if (minVecValue) minVecValue.textContent = `${val}%`;
      setSearchConfig({
        thresholds: { minVectorSimilarity: val / 100 },
      });
    });
  }

  // ─── Vector Similarity Threshold ────────────────────────────
  const vecSimSlider = document.getElementById("vector-similarity-slider");
  const vecSimValue = document.getElementById("vector-similarity-value");
  if (vecSimSlider) {
    vecSimSlider.addEventListener("input", (e) => {
      const val = parseInt(e.target.value);
      if (vecSimValue) vecSimValue.textContent = `${val}%`;
      setSearchConfig({
        thresholds: { vectorSimilarity: val / 100 },
      });
    });
  }

  // ─── Top-N Slider ───────────────────────────────────────────
  const topNSlider = document.getElementById("top-n-slider");
  const topNValue = document.getElementById("top-n-value");
  if (topNSlider) {
    topNSlider.addEventListener("input", (e) => {
      const val = parseInt(e.target.value);
      if (topNValue) topNValue.textContent = `${val}`;
      setSearchConfig({ topN: val });
    });
  }

  // ─── Reset Button ───────────────────────────────────────────
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      resetSearchConfig();
      syncSettingsUI();
      if (onReset) onReset();
    });
  }

  // Initial UI sync from state
  syncSettingsUI();
}
