// ui.js — UI rendering, DOM manipulation, event handling

import { generateUUID } from "./utils.js";

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
  contentEl.textContent = text;
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

      const newText = fullText.slice(previousText.length);
      previousText = fullText;

      contentEl.insertBefore(document.createTextNode(newText), cursor);
      scrollConversation();
    },
    getFullText: () => previousText,
    // Remove cursor, clear thinking placeholder, and optionally add citations
    finalize: (sourceChunks = null, similarities = null) => {
      // Always clear the thinking placeholder (in case onToken was never called)
      if (thinkingNode && thinkingNode.parentNode) {
        thinkingNode.parentNode.removeChild(thinkingNode);
        thinkingNode = null;
      }
      cursor.remove();

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
