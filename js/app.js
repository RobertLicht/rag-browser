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
  serializeDB,
  restoreFromData,
  validateImport,
  generateExportFilename,
} from "./orama-db.js";
import { ingestDocument, retrieveAndGenerate } from "./rag-pipeline.js";
import { isSupportedFormat, SUPPORTED_EXTENSIONS } from "./fileParser.js";
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
  setUnloadButtonStates,
  syncSettingsUI,
  syncLlmSettingsUI,
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

  // Restore persisted index from IndexedDB (always returns a database)
  db = await restoreIndex();
  console.log(`Index loaded: ${getDocumentCount(db)} documents`);

  // Update index stats in state
  setState({
    index: {
      totalChunks: getDocumentCount(db),
      totalDocuments: ingestedDocuments.length,
      embeddingDimension: 1024,
    },
  });

  // Restore document list if we have a persisted index
  if (getDocumentCount(db) > 0) {
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
    onExportDB: handleExportDB,
    onImportDB: handleImportDB,
    onClearDB: handleClearDB,
    onResetSearchConfig: handleResetSettings,
    onResetLlmConfig: handleResetLlmSettings,
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
    if (!isSupportedFormat(file.name)) {
      const ext = file.name.includes(".")
        ? file.name.slice(file.name.lastIndexOf(".")).toLowerCase()
        : "";
      let message;
      if (ext === ".doc") {
        message = `Skipping ${file.name}: .doc (binary) is unsupported in-browser. Please convert to .docx or .txt first.`;
      } else if (ext === ".ppt") {
        message = `Skipping ${file.name}: .ppt (binary) is unsupported in-browser. Please convert to .pptx or .txt first.`;
      } else {
        message = `Skipping ${file.name}: unsupported format. Supported: ${SUPPORTED_EXTENSIONS.join(", ")}`;
      }
      showNotification(message, "warning");
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
  setUnloadButtonStates(embedding === "ready", llm === "ready");
}

/**
 * Handle embedding model unload.
 *
 * Because ONNX Runtime Web shares a single global WebGPU device across all
 * inference sessions, unloading one model does NOT free its VRAM while the
 * other model's session still holds the device. To actually free VRAM we
 * unload BOTH models (which destroys the device) and then reload the LLM
 * so the user's remaining model is available immediately.
 */
async function handleUnloadEmbedding() {
  const otherWasLoaded = isLLMLoaded();

  await unloadEmbeddingModel();
  await unloadLLM();
  setState({
    models: {
      ...getState().models,
      embedding: "unloaded",
      llm: otherWasLoaded ? "loading" : "unloaded",
    },
  });

  // Show notification immediately
  showNotification("Embedding model unloaded", "info");

  // If the LLM was loaded, reload it so the user can keep using it
  if (otherWasLoaded) {
    try {
      await loadLLM(getState().hardware);
      setState({ models: { ...getState().models, llm: "ready" } });
    } catch (error) {
      console.error("Failed to reload LLM:", error);
      setState({ models: { ...getState().models, llm: "unloaded" } });
      showNotification(
        "Failed to reload LLM after unloading embedding",
        "error",
      );
    }
  }
}

/**
 * Handle LLM unload.
 *
 * Same shared-WebGPU-device reasoning as handleUnloadEmbedding — unload both
 * to destroy the device and actually free VRAM, then reload the embedding
 * model so the user can keep indexing documents.
 */
async function handleUnloadLLM() {
  const otherWasLoaded = isEmbeddingLoaded();

  await unloadLLM();
  await unloadEmbeddingModel();
  setState({
    models: {
      ...getState().models,
      llm: "unloaded",
      embedding: otherWasLoaded ? "loading" : "unloaded",
    },
  });

  // Show notification immediately
  showNotification("LLM unloaded", "info");

  // If the embedding model was loaded, reload it so the user can keep using it
  if (otherWasLoaded) {
    try {
      await loadEmbeddingModel(getState().hardware);
      setState({ models: { ...getState().models, embedding: "ready" } });
    } catch (error) {
      console.error("Failed to reload embedding model:", error);
      setState({ models: { ...getState().models, embedding: "unloaded" } });
      showNotification(
        "Failed to reload embedding model after unloading LLM",
        "error",
      );
    }
  }
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
 * Handle database clear: confirmation, then wipe in-memory DB,
 * IndexedDB persistence, ingested document list, and conversation.
 */
async function handleClearDB() {
  const count = getDocumentCount(db);
  const confirmed = confirm(
    `This will permanently delete all indexed data (${count} chunks).\n\nThis action cannot be undone. Continue?`,
  );
  if (!confirmed) {
    return;
  }

  // Replace in-memory database with a fresh empty instance
  db = createDB();

  // Clear ingested document list
  ingestedDocuments.length = 0;

  // Clear conversation
  clearConversation();
  const conversationEl = document.getElementById("conversation");
  if (conversationEl) {
    conversationEl.innerHTML = "";
  }

  // Update state
  setState({
    index: {
      totalChunks: 0,
      totalDocuments: 0,
      embeddingDimension: 1024,
    },
  });

  // Clear document list UI
  updateDocumentList([]);

  // Persist empty state to IndexedDB (clears previous data)
  try {
    await persistIndex(db);
  } catch (error) {
    console.error("Failed to persist empty index:", error);
  }

  showNotification(`Database cleared (${count} chunks removed)`, "info");
}

/**
 * Handle database export: serialize the Orama DB to a versioned JSON file
 * and trigger a browser download.
 */
function handleExportDB() {
  if (!db || getDocumentCount(db) === 0) {
    showNotification(
      "No data to export. Upload and index documents first.",
      "warning",
    );
    return;
  }

  try {
    const count = getDocumentCount(db);
    const blob = serializeDB(db);
    const filename = generateExportFilename(count);

    // Trigger download via temporary anchor element
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showNotification(`Exported ${count} chunks to ${filename}`, "info");
  } catch (error) {
    console.error("Export failed:", error);
    showNotification(`Export failed: ${error.message}`, "error");
  }
}

/**
 * Handle database import: read a JSON file, validate it, and replace
 * the current Orama database if the user confirms.
 */
async function handleImportDB(file) {
  console.log("Importing database from:", file.name);

  if (!file.name.endsWith(".json")) {
    showNotification(
      "Invalid file type. Please select a .json export file.",
      "error",
    );
    return;
  }

  try {
    const text = await file.text();
    const parsed = JSON.parse(text);

    // Validate the imported data
    const result = validateImport(parsed);
    if (!result.valid) {
      showNotification(`Import validation failed: ${result.error}`, "error");
      return;
    }

    const { rawData, metadata } = result;
    const importCount = getDocumentCount(rawData) || rawData.docs?.length || 0;

    // Check current DB size and warn about data loss
    const currentCount = db ? getDocumentCount(db) : 0;
    if (currentCount > 0) {
      const confirmed = confirm(
        `This will REPLACE your current database (${currentCount} chunks) with the imported one (${importCount} chunks).\n\nContinue?`,
      );
      if (!confirmed) {
        showNotification("Import cancelled.", "info");
        return;
      }
    }

    // Restore into a fresh, fully functional Orama database using load()
    db = await restoreFromData(rawData);
    ingestedDocuments.length = 0; // Clear old document list

    // Update state and UI
    setState({
      index: {
        totalChunks: getDocumentCount(db),
        totalDocuments: 0,
        embeddingDimension: 1024,
      },
    });

    updateDocumentList([
      {
        name: `Imported (${metadata.exportedAt ? new Date(metadata.exportedAt).toLocaleString() : file.name})`,
        chunks: importCount,
        size: 0,
      },
    ]);

    // Persist to IndexedDB
    await persistIndex(db);

    showNotification(
      `Imported database with ${importCount} chunks from ${file.name}`,
      "info",
    );
  } catch (error) {
    console.error("Import failed:", error);
    if (error instanceof SyntaxError) {
      showNotification("Import failed: file is not valid JSON.", "error");
    } else {
      showNotification(`Import failed: ${error.message}`, "error");
    }
  }
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

/**
 * Handle search settings reset.
 */
function handleResetSettings() {
  syncSettingsUI();
  showNotification("Search settings reset to defaults", "info");
}

/**
 * Handle LLM settings reset.
 */
function handleResetLlmSettings() {
  syncLlmSettingsUI();
  showNotification("LLM settings reset to defaults", "info");
}

// Bootstrap
init();
