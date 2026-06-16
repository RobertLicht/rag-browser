// ui.js — UI rendering, DOM manipulation, event handling

import { generateUUID, formatTokens } from "./utils.js";
import { renderMarkdown, renderLaTeX } from "./renderer.js";
import {
  setSearchConfig,
  resetSearchConfig,
  getState,
  setLlmConfig,
  resetLlmConfig,
  resetGenerationToPreset,
} from "./state.js";
import {
  t,
  setLanguage,
  getSupportedLanguages,
  getLanguage,
  registerLanguageChangeListener,
} from "./i18n.js";

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

  // Clear database
  const clearDbBtn = document.getElementById("clear-db-btn");
  if (clearDbBtn) {
    clearDbBtn.addEventListener("click", () => {
      if (callbacks.onClearDB) {
        callbacks.onClearDB();
      }
    });
  }

  // Initialize search settings panel
  initSearchSettings({ onReset: callbacks.onResetSearchConfig });

  // Initialize LLM settings panel
  initLlmSettings({ onReset: callbacks.onResetLlmConfig });

  // Initialize help modal
  initHelpModal();

  // Initialize theme toggle
  initThemeToggle();

  // Initialize language selector
  initLanguageSelector();

  // Refresh dynamic status bar when language changes
  registerLanguageChangeListener(() => {
    updateStatusBar(getState());
  });

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
  const hwTemplate = state.hardware.webgpuAvailable
    ? "status.hardware.gpu"
    : "status.hardware.cpu";
  hwStatus.innerHTML = `<span class="status-dot ${hwClass}"></span> ${t(hwTemplate, { device: state.hardware.device })}`;

  // Model status (colored by state)
  const embState = t(`status.modelState.${state.models.embedding}`);
  const llmState = t(`status.modelState.${state.models.llm}`);
  const embClass = `model-state-${state.models.embedding}`;
  const llmClass = `model-state-${state.models.llm}`;
  const template = t("status.models.summary");
  modelStatus.innerHTML = template
    .replace("{emb}", `<span class="${embClass}">${embState}</span>`)
    .replace("{llm}", `<span class="${llmClass}">${llmState}</span>`);

  // Index status
  indexStatus.textContent = t("status.index", {
    chunks: state.index.totalChunks,
    docs: state.index.totalDocuments,
  });

  // Token status
  updateTokenStatus(state.tokenTracking);

  // Memory status (if performance API available)
  if (performance.memory) {
    const usedMB = (performance.memory.usedJSHeapSize / 1048576).toFixed(1);
    const limitMB = (performance.memory.jsHeapSizeLimit / 1048576).toFixed(0);
    memoryStatus.textContent = t("status.memory", {
      used: usedMB,
      limit: limitMB,
    });
  }

  // WebGPU warning banner
  updateWebGpuBanner(state.hardware.webgpuAvailable);
}

/**
 * Show/hide the WebGPU warning banner based on WebGPU availability.
 * @param {boolean} webgpuAvailable
 */
export function updateWebGpuBanner(webgpuAvailable) {
  const banner = document.getElementById("webgpu-warning-banner");
  if (!banner) return;

  if (webgpuAvailable) {
    banner.style.display = "none";
  } else {
    banner.style.display = "flex";
  }
}

/**
 * Update the token status indicator in the status bar.
 * @param {Object} tracking - Token tracking state from state.js
 */
export function updateTokenStatus(tracking) {
  const tokenStatus = document.getElementById("token-status");
  if (!tokenStatus) return;

  const { totalTokens, remainingTokens, contextWindow, warningLevel } =
    tracking;

  tokenStatus.className = warningLevel;
  tokenStatus.textContent = t("status.tokens.active", {
    used: formatTokens(totalTokens),
    limit: formatTokens(contextWindow),
    remaining: formatTokens(remainingTokens),
  });

  // Update warning banner
  updateTokenWarningBanner(warningLevel, remainingTokens, contextWindow);
}

/**
 * Show/hide the token warning banner based on warning level.
 * @param {'ok' | 'warning' | 'critical' | 'exceeded'} level
 * @param {number} remainingTokens
 * @param {number} contextWindow
 */
export function updateTokenWarningBanner(
  level,
  remainingTokens,
  contextWindow,
) {
  const banner = document.getElementById("token-warning-banner");
  const warningText = document.getElementById("token-warning-text");
  if (!banner || !warningText) return;

  if (level === "ok") {
    banner.style.display = "none";
    return;
  }

  banner.style.display = "flex";
  banner.className =
    level === "critical" || level === "exceeded" ? "critical" : "";

  if (level === "exceeded") {
    warningText.textContent = t("status.token.warning.critical", {
      percent: 100,
    });
  } else if (level === "critical") {
    warningText.textContent = t("status.token.warning.critical", {
      percent: Math.round(
        ((contextWindow - remainingTokens) / contextWindow) * 100,
      ),
    });
  } else if (level === "caution") {
    warningText.textContent = t("status.token.warning.caution", {
      percent: Math.round(
        ((contextWindow - remainingTokens) / contextWindow) * 100,
      ),
    });
  } else {
    warningText.textContent = t("status.token.warning.warning", {
      percent: Math.round(
        ((contextWindow - remainingTokens) / contextWindow) * 100,
      ),
    });
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
      source.textContent = `${chunk.metadata.sourceFile} ${t("citation.chunk", { index: chunk.metadata.chunkIndex })}`;

      const preview = document.createElement("div");
      preview.className = "citation-text";
      preview.textContent = chunk.content.substring(0, 120).replace(/\n/g, " ");

      const sim = document.createElement("div");
      sim.className = "citation-similarity";
      sim.textContent = t("citation.similarity", {
        percent: (similarities[i] * 100).toFixed(1),
      });

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
  let phaseEl = null; // tracks the phase indicator element
  let renderTimeout = null;

  const PHASE_MESSAGES = {
    embedding: t("phase.embedding"),
    searching: t("phase.searching"),
    generating: t("phase.generating"),
    generating_composing: t("phase.generating_composing"),
    generating_finalizing: t("phase.generating_finalizing"),
    generating_thinking: t("phase.generating_thinking"),
    generating_formulating: t("phase.generating_formulating"),
  };

  return {
    messageEl: el,
    // Show the phase indicator with a pulsing dot and initial text
    showThinking: () => {
      phaseEl = document.createElement("div");
      phaseEl.className = "phase-indicator visible";
      phaseEl.innerHTML =
        '<span class="phase-dot"></span><span class="phase-text">' +
        t("phase.embedding") +
        "</span>";
      contentEl.insertBefore(phaseEl, cursor);
      scrollConversation();
    },
    // Update phase text as the RAG pipeline progresses through each step
    onPhase: (phase) => {
      if (!phaseEl) return;
      const textEl = phaseEl.querySelector(".phase-text");
      if (textEl && PHASE_MESSAGES[phase]) {
        textEl.textContent = PHASE_MESSAGES[phase];
      }
    },
    // Called with the final FULL accumulated text after generation completes.
    onToken: (fullText) => {
      // Remove phase indicator before showing actual response
      if (phaseEl && phaseEl.parentNode) {
        phaseEl.parentNode.removeChild(phaseEl);
        phaseEl = null;
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
    // Remove cursor and phase indicator, render final markdown+LaTeX, and optionally add citations
    finalize: (sourceChunks = null, similarities = null) => {
      // Clear any pending render timeout
      if (renderTimeout) {
        clearTimeout(renderTimeout);
        renderTimeout = null;
      }

      // Remove phase indicator if still present (e.g., if onToken was never called)
      if (phaseEl && phaseEl.parentNode) {
        phaseEl.parentNode.removeChild(phaseEl);
        phaseEl = null;
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
          source.textContent = `${chunk.metadata.sourceFile} ${t("citation.chunk", { index: chunk.metadata.chunkIndex })}`;

          const preview = document.createElement("div");
          preview.className = "citation-text";
          preview.textContent = chunk.content
            .substring(0, 120)
            .replace(/\n/g, " ");

          const sim = document.createElement("div");
          sim.className = "citation-similarity";
          sim.textContent = t("citation.similarity", {
            percent: (similarities[i] * 100).toFixed(1),
          });

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
    chunksSpan.textContent = t("doc.chunks", { count: doc.chunks });

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
  document.getElementById("modal-title").textContent = t("modal.loading.title");
  document.getElementById("modal-description").textContent = t(
    "modal.loading.description",
  );
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
    document.getElementById("step-embedding-progress").textContent =
      t("modal.loading.done");
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
    currentProgress.textContent = t("modal.loading.ready");
  } else if (status === "init") {
    currentProgress.textContent = t("modal.loading.initializing");
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
  totalProgress.textContent = t("modal.loading.overall", {
    percent: Math.round(overallProgress),
  });
}

/**
 * Enable or disable the file input based on model loading state.
 * Only the embedding model is required for file uploads (needed for generating embeddings).
 * Also toggles the wrapper's .disabled class for tooltip visibility.
 * @param {boolean} enabled
 */
export function setFileInputEnabled(enabled) {
  const fileInput = document.getElementById("file-input");
  const wrapper = document.getElementById("file-input-wrapper");
  fileInput.disabled = !enabled;
  if (wrapper) {
    wrapper.classList.toggle("disabled", !enabled);
  }
}

/**
 * Enable or disable the Send button and query input based on model loading state.
 * Both embedding and LLM must be 'ready' to enable querying.
 * If `isGenerating` is true, keeps the button disabled even if models are ready.
 * @param {boolean} enabled
 * @param {boolean} [isGenerating=false] - Whether LLM generation is currently in progress
 */
export function setSendButtonEnabled(enabled, isGenerating = false) {
  const sendBtn = document.getElementById("send-btn");
  const queryInput = document.getElementById("query-input");
  const actuallyEnabled = enabled && !isGenerating;
  if (sendBtn) {
    sendBtn.disabled = !actuallyEnabled;
  }
  if (queryInput) {
    queryInput.disabled = !actuallyEnabled;
  }
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

/**
 * Initialize LLM settings panel controls.
 * Wires up the thinking mode toggle and generation parameter sliders.
 *
 * @param {Object} options - Options object
 * @param {Function} options.onReset - Callback when reset is triggered
 */
export function initLlmSettings({ onReset }) {
  // DOM references
  const toggle = document.getElementById("thinking-toggle");
  const temperatureSlider = document.getElementById("temperature-slider");
  const temperatureValue = document.getElementById("temperature-value");
  const topPSlider = document.getElementById("top-p-slider");
  const topPValue = document.getElementById("top-p-value");
  const topKSlider = document.getElementById("top-k-slider");
  const topKValue = document.getElementById("top-k-value");
  const minPSlider = document.getElementById("min-p-slider");
  const minPValue = document.getElementById("min-p-value");
  const presencePenaltySlider = document.getElementById(
    "presence-penalty-slider",
  );
  const presencePenaltyValue = document.getElementById(
    "presence-penalty-value",
  );
  const repetitionPenaltySlider = document.getElementById(
    "repetition-penalty-slider",
  );
  const repetitionPenaltyValue = document.getElementById(
    "repetition-penalty-value",
  );

  // ─── Thinking Mode Toggle ───────────────────────────────
  if (toggle) {
    toggle.addEventListener("change", (e) => {
      setLlmConfig({ enableThinking: e.target.checked });
      syncLlmSettingsUI(); // Update sliders to reflect new preset
    });
  }

  // ─── Max Thinking Tokens Slider ─────────────────────────
  const maxThinkingSlider = document.getElementById(
    "max-thinking-tokens-slider",
  );
  const maxThinkingValue = document.getElementById("max-thinking-tokens-value");
  if (maxThinkingSlider && maxThinkingValue) {
    maxThinkingSlider.addEventListener("input", (e) => {
      const val = parseInt(e.target.value, 10);
      maxThinkingValue.textContent = e.target.value;
      setLlmConfig({ maxThinkingTokens: val });
    });
  }

  // ─── Generation Parameter Sliders ───────────────────────
  const genParams = [
    {
      slider: temperatureSlider,
      value: temperatureValue,
      key: "temperature",
      decimals: 2,
    },
    { slider: topPSlider, value: topPValue, key: "top_p", decimals: 2 },
    { slider: topKSlider, value: topKValue, key: "top_k", decimals: 0 },
    { slider: minPSlider, value: minPValue, key: "min_p", decimals: 2 },
    {
      slider: presencePenaltySlider,
      value: presencePenaltyValue,
      key: "presence_penalty",
      decimals: 1,
    },
    {
      slider: repetitionPenaltySlider,
      value: repetitionPenaltyValue,
      key: "repetition_penalty",
      decimals: 2,
    },
    {
      slider: document.getElementById("max-new-tokens-slider"),
      value: document.getElementById("max-new-tokens-value"),
      key: "max_new_tokens",
      decimals: 0,
    },
  ];

  genParams.forEach(({ slider, value, key, decimals }) => {
    if (slider && value) {
      slider.addEventListener("input", (e) => {
        const numValue =
          decimals === 0
            ? parseInt(e.target.value, 10)
            : parseFloat(parseFloat(e.target.value).toFixed(decimals));
        value.textContent = e.target.value;
        setLlmConfig({ generation: { [key]: numValue } });
      });
    }
  });

  // Initial UI sync from state
  syncLlmSettingsUI();

  // ─── Reset to Preset Button ─────────────────────────────
  const resetBtn = document.getElementById("reset-llm-btn");
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      resetGenerationToPreset();
      syncLlmSettingsUI();
    });
  }
}

/**
 * Sync LLM settings UI controls to match current state.
 */
export function syncLlmSettingsUI() {
  const { llmConfig } = getState();

  // Thinking toggle
  const toggle = document.getElementById("thinking-toggle");
  if (toggle) {
    toggle.checked = llmConfig.enableThinking;
  }

  // Max thinking tokens control — visibility and slider value
  const thinkingControl = document.getElementById("thinking-tokens-control");
  if (thinkingControl) {
    thinkingControl.style.display = llmConfig.enableThinking ? "block" : "none";
  }
  const maxThinkingSlider = document.getElementById(
    "max-thinking-tokens-slider",
  );
  const maxThinkingValue = document.getElementById("max-thinking-tokens-value");
  if (maxThinkingSlider && maxThinkingValue) {
    maxThinkingSlider.value = llmConfig.maxThinkingTokens;
    maxThinkingValue.textContent = String(llmConfig.maxThinkingTokens);
  }

  // Generation parameter sliders
  const gen = llmConfig.generation;
  const genParams = [
    {
      slider: () => document.getElementById("temperature-slider"),
      value: () => document.getElementById("temperature-value"),
      key: "temperature",
      decimals: 2,
    },
    {
      slider: () => document.getElementById("top-p-slider"),
      value: () => document.getElementById("top-p-value"),
      key: "top_p",
      decimals: 2,
    },
    {
      slider: () => document.getElementById("top-k-slider"),
      value: () => document.getElementById("top-k-value"),
      key: "top_k",
      decimals: 0,
    },
    {
      slider: () => document.getElementById("min-p-slider"),
      value: () => document.getElementById("min-p-value"),
      key: "min_p",
      decimals: 2,
    },
    {
      slider: () => document.getElementById("presence-penalty-slider"),
      value: () => document.getElementById("presence-penalty-value"),
      key: "presence_penalty",
      decimals: 1,
    },
    {
      slider: () => document.getElementById("repetition-penalty-slider"),
      value: () => document.getElementById("repetition-penalty-value"),
      key: "repetition_penalty",
      decimals: 2,
    },
    {
      slider: () => document.getElementById("max-new-tokens-slider"),
      value: () => document.getElementById("max-new-tokens-value"),
      key: "max_new_tokens",
      decimals: 0,
    },
  ];

  genParams.forEach(({ slider, value, key, decimals }) => {
    const s = slider();
    const v = value();
    if (s && v) {
      s.value = gen[key];
      v.textContent = String(gen[key]);
    }
  });
}

/**
 * Initialize the Help/About modal with open/close behavior and Mermaid rendering.
 */
function initHelpModal() {
  const helpBtn = document.getElementById("help-btn");
  const helpModal = document.getElementById("help-modal");
  const helpCloseBtn = document.getElementById("help-modal-close");

  if (!helpBtn || !helpModal) return;

  const openModal = async (scrollToId) => {
    helpModal.style.display = "flex";
    // Render Mermaid diagrams inside the modal
    if (typeof mermaid !== "undefined") {
      try {
        await mermaid.run({
          nodes: helpModal.querySelectorAll(".mermaid"),
        });
      } catch (err) {
        console.warn("Mermaid rendering failed:", err);
      }
    }
    // Scroll to specific section if requested
    if (scrollToId) {
      const target = document.getElementById(scrollToId);
      if (target) {
        setTimeout(() => {
          target.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 100); // Small delay to ensure modal is rendered
      }
    }
  };

  const closeModal = () => {
    helpModal.style.display = "none";
  };

  // Open modal on help button click
  helpBtn.addEventListener("click", () => openModal());

  // Close modal on close button click
  if (helpCloseBtn) {
    helpCloseBtn.addEventListener("click", closeModal);
  }

  // Close modal on overlay click (outside content)
  helpModal.addEventListener("click", (e) => {
    if (e.target === helpModal) {
      closeModal();
    }
  });

  // Close modal on Escape key
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && helpModal.style.display === "flex") {
      closeModal();
    }
  });

  // WebGPU help button — open modal and scroll to Enable WebGPU section
  const webgpuHelpBtn = document.getElementById("webgpu-help-btn");
  if (webgpuHelpBtn) {
    webgpuHelpBtn.addEventListener("click", () =>
      openModal("help-enable-webgpu"),
    );
  }
}

/**
 * Initialize the theme toggle button.
 * Reads persisted theme from localStorage (or defaults to "dark"),
 * applies it, and wires the click handler.
 */
export function initThemeToggle() {
  const btn = document.getElementById("theme-toggle-btn");
  if (!btn) return;

  const currentTheme = localStorage.getItem("theme") || "dark";
  applyThemeEmoji(btn, currentTheme);

  btn.addEventListener("click", () => {
    const prev = localStorage.getItem("theme") || "dark";
    const next = prev === "dark" ? "light" : "dark";
    localStorage.setItem("theme", next);
    document.documentElement.setAttribute("data-theme", next);
    applyThemeEmoji(btn, next);
  });
}

/**
 * Update the toggle button emoji to match the active theme.
 * @param {HTMLElement} btn
 * @param {"dark"|"light"} theme
 */
function applyThemeEmoji(btn, theme) {
  btn.textContent = theme === "dark" ? "🌙" : "☀️";
}

/**
 * Initialize the language selector dropdown in the status bar.
 * - Toggle dropdown open/close on button click
 * - Close on click outside or Escape key
 * - Highlight currently active language
 * - Switch language on selection
 */
export function initLanguageSelector() {
  const btn = document.getElementById("lang-selector-btn");
  const dropdown = document.getElementById("lang-selector-dropdown");
  if (!btn || !dropdown) return;

  const languages = getSupportedLanguages();

  // Update dropdown button with current language label
  btn.textContent = languages[getLanguage()]?.nativeLabel ?? "EN";

  // Toggle dropdown on button click
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    const isOpen = dropdown.classList.toggle("open");
    // Update active language indicator
    dropdown.querySelectorAll("button").forEach((item) => {
      item.setAttribute(
        "data-lang-active",
        item.dataset.lang === getLanguage() ? "true" : "false",
      );
    });
  });

  // Handle language selection
  dropdown.querySelectorAll("button").forEach((item) => {
    item.addEventListener("click", () => {
      const lang = item.dataset.lang;
      if (lang && languages[lang]) {
        setLanguage(lang);
        // Update button label
        btn.textContent = languages[lang].nativeLabel;
        // Close dropdown
        dropdown.classList.remove("open");
      }
    });
  });

  // Close dropdown on click outside
  document.addEventListener("click", (e) => {
    if (!btn.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.classList.remove("open");
    }
  });

  // Close dropdown on Escape key
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      dropdown.classList.remove("open");
    }
  });
}
