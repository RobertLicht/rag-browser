// app.js — Main application entry point. Bootstraps modules and coordinates lifecycle.

import { detectHardware } from "./hardware.js";
import {
  getState,
  setState,
  subscribe,
  addMessage,
  clearConversation,
} from "./state.js";
import {
  loadEmbeddingModel,
  unloadEmbeddingModel,
  isEmbeddingLoaded,
} from "./embedding.js";
import { loadLLM, unloadLLM, stopGeneration, isLLMLoaded } from "./llm.js";
import {
  createDB,
  getDocumentCount,
  persistIndex,
  restoreIndex,
} from "./orama-db.js";
import { ingestDocument, retrieveAndGenerate } from "./rag-pipeline.js";
import {
  initUI,
  updateStatusBar,
  renderUserMessage,
  renderAssistantMessage,
  renderStreamingMessage,
  updateProgress,
  updateDocumentList,
  showNotification,
  showLoadingModal,
  hideLoadingModal,
  updateLoadingModal,
  setFileInputEnabled,
} from "./ui.js";
import { formatBytes } from "./utils.js";

// Orama database instance (shared across ingestion and retrieval)
let db = null;

// Track ingested documents for sidebar display
const ingestedDocuments = [];

// Track whether generation is in progress
let isGenerating = false;

/**
 * Bootstrap the application.
 * 1. Detect hardware capabilities
 * 2. Restore persisted index (if any)
 * 3. Initialize Orama database
 * 4. Wire up UI callbacks
 */
export async function init() {
  // Hardware detection
  const hardware = await detectHardware();
  setState({ hardware });

  // Try to restore persisted index from IndexedDB
  const restoredDb = await restoreIndex();
  if (restoredDb) {
    db = restoredDb;
    console.log(
      `Restored index from IndexedDB: ${getDocumentCount(db)} documents`,
    );
  } else {
    db = createDB();
  }

  // Update index stats in state
  setState({
    index: {
      totalChunks: getDocumentCount(db),
      totalDocuments: ingestedDocuments.length,
      embeddingDimension: 1024,
    },
  });

  // Restore document list if we have a persisted index
  if (restoredDb && getDocumentCount(db) > 0) {
    updateDocumentList([
      {
        name: "Restored from IndexedDB",
        chunks: getDocumentCount(db),
        size: 0,
      },
    ]);
  }

  // Initialize UI
  const { sendBtn, stopBtn, queryInput } = initUI({
    onFileUpload: handleFileUpload,
    onQuery: handleQuery,
    onStop: handleStop,
    onLoadModels: handleLoadModels,
    onUnloadEmbedding: handleUnloadEmbedding,
    onUnloadLLM: handleUnloadLLM,
    onClearChat: handleClearChat,
  });

  // Subscribe to state changes for UI updates
  subscribe(updateStatusBar);
  subscribe(updateModelState);

  // Update status bar immediately
  updateStatusBar(getState());
  updateModelState(getState());

  // Register service worker if available
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Silently fail — SW is optional for offline support
    });
  }

  console.log("RAG-Browser initialized.");
}

/**
 * Handle file upload: validate, ingest, and update UI.
 * @param {File[]} files
 */
async function handleFileUpload(files) {
  for (const file of files) {
    if (!file.name.endsWith(".txt")) {
      showNotification(
        `Skipping ${file.name}: only .txt files supported`,
        "warning",
      );
      continue;
    }

    // Load embedding model if not loaded
    if (!isEmbeddingLoaded()) {
      showNotification("Loading embedding model...", "info");
      setState({ models: { ...getState().models, embedding: "loading" } });

      try {
        await loadEmbeddingModel(getState().hardware);
        setState({ models: { ...getState().models, embedding: "ready" } });
      } catch (error) {
        console.error("Failed to load embedding model:", error);
        showNotification("Failed to load embedding model", "error");
        return;
      }
    }

    // Ingest document
    try {
      const result = await ingestDocument(file, db, (progress) => {
        updateProgress(progress);
      });

      // Update state and UI
      ingestedDocuments.push({
        name: file.name,
        chunks: result.chunks,
        size: result.fileSize,
      });

      setState({
        index: {
          totalChunks: getDocumentCount(db),
          totalDocuments: ingestedDocuments.length,
          embeddingDimension: 1024,
        },
      });

      updateDocumentList(ingestedDocuments);

      // Persist index to IndexedDB
      await persistIndex(db);

      showNotification(`Successfully indexed ${file.name}`, "info");
    } catch (error) {
      console.error("Ingestion failed:", error);
      showNotification(
        `Failed to index ${file.name}: ${error.message}`,
        "error",
      );
    }
  }
}

/**
 * Handle user query: render message, retrieve context, generate response.
 * @param {string} query
 */
async function handleQuery(query) {
  if (isGenerating) return;

  // Render user message
  renderUserMessage(query);

  // Add to conversation history
  addMessage("user", query);

  // Disable send button, show stop button
  const { sendBtn, stopBtn, queryInput } = getUIButtons();
  sendBtn.disabled = true;
  stopBtn.style.display = "inline-block";
  queryInput.disabled = true;
  isGenerating = true;

  try {
    // Load LLM if not loaded
    if (!isLLMLoaded()) {
      setState({ models: { ...getState().models, llm: "loading" } });
      try {
        await loadLLM(getState().hardware);
        setState({ models: { ...getState().models, llm: "ready" } });
      } catch (error) {
        console.error("Failed to load LLM:", error);
        showNotification("Failed to load LLM", "error");
        resetUIButtons();
        return;
      }
    }

    // Check if we have documents to search
    if (getDocumentCount(db) === 0) {
      const emptyMsg = renderStreamingMessage();
      emptyMsg.onToken(
        "Please upload some .txt documents first so I have context to answer your questions.",
      );
      emptyMsg.finalize();
      addMessage(
        "assistant",
        "Please upload some .txt documents first so I have context to answer your questions.",
      );
      return;
    }

    // Create streaming message renderer
    const messageRenderer = renderStreamingMessage();

    // Show loading state while model generates (no more streaming tokens)
    messageRenderer.showThinking();

    // Run retrieval + generation pipeline
    let completed = false;
    const pipelineResult = await retrieveAndGenerate(
      query,
      db,
      messageRenderer.onToken,
      (fullText, { sourceChunks, similarity }) => {
        // onComplete callback — sourceChunks and similarity are passed
        // as arguments here, avoiding the temporal dead zone problem
        // that occurs when referencing the destructured variables before
        // the await resolves.
        completed = true;
        messageRenderer.finalize(sourceChunks, similarity);
        addMessage("assistant", fullText, sourceChunks);
      },
    );

    const { sourceChunks, similarity } = pipelineResult;

    // If onComplete wasn't called (e.g. generation was stopped), finalize with partial text
    if (!completed) {
      const partialText = messageRenderer.getFullText();
      if (partialText) {
        messageRenderer.finalize(sourceChunks, similarity);
        addMessage("assistant", partialText, sourceChunks);
      }
    }
  } catch (error) {
    console.error("Query failed:", error);
    showNotification(`Query failed: ${error.message}`, "error");
  } finally {
    resetUIButtons();
    isGenerating = false;
  }
}

/**
 * Handle stop generation.
 */
function handleStop() {
  stopGeneration();
}

/**
 * Handle explicit model loading.
 */
async function handleLoadModels() {
  const config = getState().hardware;

  // Show loading modal
  showLoadingModal();

  // Load embedding model
  if (!isEmbeddingLoaded()) {
    setState({ models: { ...getState().models, embedding: "loading" } });

    try {
      await loadEmbeddingModel(config, (info) => {
        onModelProgress("embedding", info);
      });
      setState({ models: { ...getState().models, embedding: "ready" } });
      updateLoadingModal("embedding", 100, "ready");
    } catch (error) {
      console.error("Failed to load embedding model:", error);
      showNotification("Failed to load embedding model", "error");
      hideLoadingModal();
      return;
    }
  } else {
    // Already loaded - mark as done
    updateLoadingModal("embedding", 100, "ready");
  }

  // Load LLM
  if (!isLLMLoaded()) {
    setState({ models: { ...getState().models, llm: "loading" } });

    try {
      await loadLLM(config, (info) => {
        onModelProgress("llm", info);
      });
      setState({ models: { ...getState().models, llm: "ready" } });
      updateLoadingModal("llm", 100, "ready");
    } catch (error) {
      console.error("Failed to load LLM:", error);
      showNotification("Failed to load LLM", "error");
      hideLoadingModal();
      return;
    }
  } else {
    // Already loaded - mark as done
    updateLoadingModal("llm", 100, "ready");
  }

  // Small delay so user sees the final state
  await new Promise((r) => setTimeout(r, 600));
  hideLoadingModal();
  showNotification("Models loaded successfully", "info");
}

/**
 * Process progress callback info from transformers.js pipeline() and update the modal.
 * @param {'embedding'|'llm'} step - Which model is loading
 * @param {Object} info - Progress info from transformers.js
 */
function onModelProgress(step, info) {
  if (info.status === "progress_total") {
    updateLoadingModal(step, info.progress);
  } else if (info.status === "download") {
    const progress = info.total ? (info.loaded / info.total) * 100 : 0;
    updateLoadingModal(step, progress, info.status, info.name);
  } else if (info.status === "init") {
    updateLoadingModal(step, 0, info.status);
  }
}

/**
 * React to model state changes: enable file input when both models are ready.
 * @param {Object} state - Current application state
 */
function updateModelState(state) {
  const { embedding, llm } = state.models;
  setFileInputEnabled(embedding === "ready" && llm === "ready");
}

/**
 * Handle embedding model unload.
 */
async function handleUnloadEmbedding() {
  await unloadEmbeddingModel();
  setState({ models: { ...getState().models, embedding: "unloaded" } });
  showNotification("Embedding model unloaded", "info");
}

/**
 * Handle LLM unload.
 */
async function handleUnloadLLM() {
  await unloadLLM();
  setState({ models: { ...getState().models, llm: "unloaded" } });
  showNotification("LLM unloaded", "info");
}

/**
 * Handle clear chat.
 */
function handleClearChat() {
  clearConversation();
  document.getElementById("conversation").innerHTML = "";
  showNotification("Chat cleared", "info");
}

/**
 * Get references to UI buttons (used in async handlers).
 */
function getUIButtons() {
  return {
    sendBtn: document.getElementById("send-btn"),
    stopBtn: document.getElementById("stop-btn"),
    queryInput: document.getElementById("query-input"),
  };
}

/**
 * Reset UI buttons to default state.
 */
function resetUIButtons() {
  const { sendBtn, stopBtn, queryInput } = getUIButtons();
  sendBtn.disabled = false;
  stopBtn.style.display = "none";
  queryInput.disabled = false;
}

// Bootstrap
init();
