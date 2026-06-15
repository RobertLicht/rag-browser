// i18n.js — Internationalization module

const SUPPORTED_LANGUAGES = {
  en: { label: "English", nativeLabel: "English" },
  de: { label: "German", nativeLabel: "Deutsch" },
  it: { label: "Italian", nativeLabel: "Italiano" },
  es: { label: "Spanish", nativeLabel: "Español" },
  fr: { label: "French", nativeLabel: "Français" },
};

const FALLBACK_LANG = "en";

/**
 * Translation dictionary. Keys use dot-notation organized by domain.
 * Interpolation uses {placeholder} syntax.
 */
const translations = {
  // ─── English (base) ─────────────────────────────────────────
  en: {
    // Status bar
    "status.hardware.detecting": "Detecting hardware...",
    "status.hardware.gpu": "WebGPU ({device})",
    "status.hardware.cpu": "WASM ({device})",
    "status.models.unloaded": "Models: unloaded",
    "status.models.embedding": "Models: embedding",
    "status.models.llm": "Models: LLM",
    "status.models.both": "Models: both ready",
    "status.models.summary": "Embedding: {emb} | LLM: {llm}",
    "status.index": "Index: {chunks} chunks, {docs} documents",
    "status.tokens": "Tokens: {input} in / {output} out",
    "status.tokens.idle": "Tokens: --",
    "status.tokens.active": "Tokens: {used} / {limit} ({remaining} left)",
    "status.memory": "Memory: {used} / {limit} MB",
    "status.memory.idle": "Memory: --",
    "status.token.warning.caution":
      "Context usage approaching limit ({percent}%). Consider clearing chat.",
    "status.token.warning.warning":
      "Context nearly full ({percent}%). Clear chat to continue.",
    "status.token.warning.critical":
      "Context full ({percent}%). Clear chat immediately.",
    "status.token.warning.clearChat": "Clear Chat",

    // Model loading modal
    "modal.loading.title": "Loading Models",
    "modal.loading.description": "Downloading and initializing AI models...",
    "modal.loading.step.embedding": "Embedding Model (Qwen3-Embedding-0.6B)",
    "modal.loading.step.llm": "Language Model (Qwen3.5-2B)",
    "modal.loading.done": "done",
    "modal.loading.ready": "ready",
    "modal.loading.initializing": "initializing",
    "modal.loading.overall": "Overall: {percent}%",

    // Sidebar
    "sidebar.documents": "Documents",
    "sidebar.tooltip.embeddingRequired":
      "Load the embedding model first to enable file uploads.",
    "sidebar.upload.files": "Upload files",
    "sidebar.btn.loadModels": "Load Models",
    "sidebar.btn.unloadEmbedding": "Unload Embedding Model",
    "sidebar.btn.unloadLlm": "Unload LLM",
    "sidebar.btn.clearChat": "Clear Chat",

    // Database actions
    "db.export": "Export Database",
    "db.import": "Import Database",
    "db.clear": "Clear Database",

    // Chat
    "chat.placeholder": "Ask a question about your documents...",
    "chat.tooltip.queryDisabled":
      "Load the relevant models first to enable querying.",
    "chat.send": "Send",
    "chat.stop": "Stop",

    // Phase messages (streaming)
    "phase.embedding": "Embedding query...",
    "phase.searching": "Searching documents...",
    "phase.generating": "Generating response...",
    "phase.generating_composing": "Composing answer...",
    "phase.generating_finalizing": "Finalizing response...",
    "phase.generating_thinking": "Thinking...",
    "phase.generating_formulating": "Formulating response...",

    // Notifications
    "notif.loadingEmbedding": "Loading embedding model...",
    "notif.failedEmbedding": "Failed to load embedding model: {error}",
    "notif.failedLlm": "Failed to load LLM: {error}",
    "notif.modelsLoaded": "Models loaded successfully",
    "notif.generating": "Generating response...",
    "notif.stopped": "Response stopped by user",
    "notif.chatCleared": "Chat history cleared",
    "notif.dbExported": "Database exported successfully",
    "notif.dbImported": "Database imported successfully ({count} chunks added)",
    "notif.dbCleared": "Database cleared",
    "notif.dbMergeConfirm":
      "Merge {imported} chunks from file into existing {existing} chunks?",
    "notif.settingsReset": "Settings reset to defaults",
    "notif.llmSettingsReset": "LLM settings reset to preset",
    "notif.fileIndexed": "Successfully indexed {file}",
    "notif.fileIndexFailed": "Failed to index {file}: {error}",
    "notif.noDocuments":
      "Please upload some documents first so I have context to answer your questions.",
    "notif.queryFailed": "Query failed: {error}",
    "notif.embeddingUnloaded": "Embedding model unloaded",
    "notif.reloadLlmFailed":
      "Failed to reload LLM after unloading embedding model",
    "notif.llmUnloaded": "LLM unloaded",
    "notif.reloadEmbeddingFailed":
      "Failed to reload embedding model after unloading LLM",
    "notif.dbClearedWithCount": "Database cleared ({count} chunks removed)",
    "notif.noDataExport":
      "No data to export. Upload and index documents first.",
    "notif.exported": "Exported {count} chunks to {filename}",
    "notif.exportFailed": "Export failed: {error}",
    "notif.invalidFileType":
      "Invalid file type. Please select a .json export file.",
    "notif.importValidationFailed": "Import validation failed: {error}",
    "notif.importCancelled": "Import cancelled.",
    "notif.imported": "Imported {count} chunks from {file}",
    "notif.invalidJson": "Import failed: file is not valid JSON.",
    "notif.importFailed": "Import failed: {error}",
    "notif.dbClearConfirm":
      "This will permanently delete all indexed data ({count} chunks).",
    "notif.cannotUndo": "This action cannot be undone. Continue?",
    "notif.importReplaceConfirm":
      "This will REPLACE your current database ({current} chunks) with the imported one ({imported} chunks).\n\nContinue?",

    // Search settings
    "settings.search.title": "Search Settings",
    "settings.search.mode": "Search Mode",
    "settings.search.mode.hybrid": "Hybrid (Recommended)",
    "settings.search.mode.vector": "Vector Only",
    "settings.search.balance": "Keyword vs Semantic Balance",
    "settings.search.bm25": "BM25: {value}%",
    "settings.search.vector": "Vector: {value}%",
    "settings.similarityThresholds": "Similarity Thresholds",
    "settings.hybridScore": "Hybrid Score",
    "settings.vectorGate": "Vector Gate",
    "settings.vectorSimilarity": "Vector Similarity",
    "settings.maxResults": "Max Results (Top-N)",
    "settings.btn.resetDefaults": "Reset to Defaults",

    // LLM settings
    "settings.llm.title": "LLM Settings",
    "settings.llm.thinking": "Enable Thinking",
    "settings.llm.thinkingDesc":
      "Model reasons through its response before answering. Useful for complex problems but slower and uses more tokens.",
    "settings.llm.maxThinkingTokens": "Max Thinking Tokens",
    "settings.llm.maxThinkingTokensDesc":
      "Maximum tokens allocated to the model's internal reasoning process. Lower values produce faster reasoning, higher values allow deeper analysis.",
    "settings.llm.genParams": "Generation Parameters",
    "settings.llm.genParamsDesc":
      "Values auto-adjust when switching thinking mode. Manual overrides are allowed.",
    "settings.llm.temperature": "Temperature",
    "settings.llm.topP": "Top-p",
    "settings.llm.topK": "Top-k",
    "settings.llm.minP": "Min-p",
    "settings.llm.presencePenalty": "Presence Penalty",
    "settings.llm.repetitionPenalty": "Repetition Penalty",
    "settings.llm.maxNewTokens": "Max New Tokens",
    "settings.llm.btn.resetPreset": "Reset to Preset",

    // Document list
    "doc.chunks": "{count} chunks",

    // Help button / theme toggle tooltips
    "tooltip.theme": "Toggle theme",
    "tooltip.help": "About this app",

    // Citations
    "citation.similarity": "Similarity: {percent}%",
    "citation.chunk": "(chunk {index})",

    // Model states
    "status.modelState.ready": "ready",
    "status.modelState.loading": "loading",
    "status.modelState.unloaded": "unloaded",

    // Language selector
    "lang.tooltip": "Select language",

    // App messages
    "app.restoredIndexedDb": "Restored from IndexedDB",

    // Chat placeholder
    "chat.empty": "Upload some documents, then ask a question about them.",

    // Notifications
    "notif.fileSkipped.doc":
      "Skipping {file}: .doc (binary) is unsupported in-browser. Please convert to .docx or .txt first.",
    "notif.fileSkipped.ppt":
      "Skipping {file}: .ppt (binary) is unsupported in-browser. Please convert to .pptx or .txt first.",
    "notif.fileSkipped.other":
      "Skipping {file}: unsupported format. Supported: {formats}",

    // Help modal — Overview
    "help.title": "RAG-Browser &mdash; About",
    "help.overview.title": "Overview",
    "help.overview.description":
      "A fully client-side, browser-based <strong>Retrieval-Augmented Generation (RAG)</strong> agent. Upload documents (<code>.txt</code>, <code>.md</code>, <code>.csv</code>, <code>.xls</code>, <code>.xlsx</code>, <code>.docx</code>, <code>.pptx</code>, <code>.odt</code>, <code>.ods</code>, <code>.odp</code>, <code>.pdf</code>), embed them locally, and query them conversationally &mdash; all without a server, API keys, or cloud infrastructure.",
    "help.overview.privacy":
      "<strong>No user data ever leaves your device.</strong> All inference runs locally in your browser.",
    "help.architecture.title": "Architecture",
    "help.storage.title": "Model Storage &amp; Cache",
    "help.storage.whereTitle": "Where is the model stored?",
    "help.storage.whereDesc":
      "The models are cached in your browser's storage:",
    "help.storage.step1":
      "Open Developer Tools (<kbd>F12</kbd> or <kbd>Ctrl+Shift+I</kbd>)",
    "help.storage.step2": "Go to the <strong>Application</strong> tab",
    "help.storage.step3": "Expand <strong>Storage &rarr; IndexedDB</strong>",
    "help.storage.step4":
      "Look for databases containing <em>transformers</em> or <em>huggingface</em>",
    "help.storage.step5":
      "Model files are stored in <strong>Cache Storage</strong> under <em>transformers-cache</em>",
    "help.storage.deleteTitle": "How to delete the model cache?",
    "help.storage.method1":
      "<strong>Method 1 &mdash; Via Developer Tools:</strong>",
    "help.storage.m1Step1": "Open Developer Tools (<kbd>F12</kbd>)",
    "help.storage.m1Step2": "Go to <strong>Application</strong> tab",
    "help.storage.m1Step3":
      "Click <strong>Storage &rarr; Clear storage</strong>",
    "help.storage.m1Step4":
      "Check <strong>Cache storage</strong> and <strong>IndexedDB</strong>",
    "help.storage.m1Step5": "Click <strong>Clear site data</strong>",
    "help.storage.method2":
      "<strong>Method 2 &mdash; Via Browser Settings:</strong>",
    "help.storage.m2Step1":
      "Go to browser <strong>Settings &rarr; Privacy &amp; Security</strong>",
    "help.storage.m2Step2": "Click <strong>Clear browsing data</strong>",
    "help.storage.m2Step3": "Select <strong>Cached images and files</strong>",
    "help.storage.m2Step4": "Choose time range and clear",
    "help.storage.method3": "<strong>Method 3 &mdash; Via Console:</strong>",
    "help.storage.m3Step1": "Open <strong>Console</strong> in Developer Tools",
    "help.storage.m3Step2":
      "Run: <code>caches.keys().then(keys => keys.forEach(k => caches.delete(k)))</code>",
    "help.webgpu.title": "Enable WebGPU",
    "help.webgpu.warning":
      "<strong>Important:</strong> WebGPU significantly improves performance. Without it, the model runs on CPU which can be <strong>10&ndash;50&times; slower</strong>.",
    "help.webgpu.chromeTitle": "Google Chrome &amp; Microsoft Edge (Chromium)",
    "help.webgpu.chromeDesc":
      "WebGPU is enabled by default starting with Chrome 113 and Edge 113. If it is not available:",
    "help.webgpu.chromeStep1":
      "Navigate to <code>chrome://flags</code> (or <code>edge://flags</code>)",
    "help.webgpu.chromeStep2": "Search for <strong>WebGPU</strong>",
    "help.webgpu.chromeStep3":
      "Set <strong>Unsafe WebGPU</strong> to <em>Enabled</em>",
    "help.webgpu.chromeStep4": "Click <strong>Relaunch</strong>",
    "help.webgpu.chromeCmd":
      "<strong>Command Line Alternative:</strong> <code>--enable-unsafe-webgpu</code>",
    "help.webgpu.firefoxTitle": "Mozilla Firefox",
    "help.webgpu.firefoxDesc":
      "WebGPU is enabled by default from Firefox 141+ (Windows) and 145+ (macOS). To enable manually:",
    "help.webgpu.firefoxStep1":
      "Type <code>about:config</code> in the address bar and accept the warning",
    "help.webgpu.firefoxStep2":
      "Search for <strong><code>dom.webgpu.enabled</code></strong>",
    "help.webgpu.firefoxStep3": "Toggle to <strong>true</strong>",
    "help.webgpu.firefoxStep4":
      "Optionally set <strong><code>gfx.webgpu.ignore-blocklist</code></strong> to <strong>true</strong> if blocked",
    "help.webgpu.safariTitle": "Safari",
    "help.webgpu.safariDesc":
      "WebGPU is enabled by default starting with Safari 26 (macOS Tahoe 26, iOS 26). Earlier versions require Safari Technology Preview.",
    "help.webgpu.linuxTitle": "Linux (Chrome/Chromium)",
    "help.webgpu.linuxDesc": "Launch with the following flags:",
    "help.webgpu.linuxExtra":
      "<em>Ensure your graphics drivers are up-to-date. You may also try <code>--ozone-platform=x11</code> instead of Wayland.</em>",
    "help.webgpu.tableTitle": "Browser Support Summary",
    "help.webgpu.tableBrowser": "Browser",
    "help.webgpu.tableStatus": "Status",
    "help.webgpu.tableEnable": "How to Enable",
    "help.webgpu.tips":
      "<strong>Tips:</strong> Ensure Hardware Acceleration is enabled in your browser settings. Keep your GPU drivers updated for best performance.",
    "help.license.title": "License",
    "help.license.desc":
      "This project is provided as-is for personal and research use.",
    "help.license.thirdParty": "Third-Party Models",
    "help.license.thirdPartyDesc":
      "This application incorporates the following models, licensed under the Apache License 2.0:",
    "help.license.seeLicense":
      'See the <a href="https://www.apache.org/licenses/LICENSE-2.0" target="_blank" rel="noopener">Apache License 2.0</a> for full terms.',
  },

  // ─── German ─────────────────────────────────────────────────
  de: {
    "status.hardware.detecting": "Hardware wird erkannt...",
    "status.hardware.gpu": "WebGPU ({device})",
    "status.hardware.cpu": "WASM ({device})",
    "status.models.unloaded": "Modelle: nicht geladen",
    "status.models.embedding": "Modelle: Embedding",
    "status.models.llm": "Modelle: LLM",
    "status.models.both": "Modelle: beide bereit",
    "status.models.summary": "Embedding: {emb} | LLM: {llm}",
    "status.index": "Index: {chunks} Chunks, {docs} Dokumente",
    "status.tokens": "Tokens: {input} ein / {output} aus",
    "status.tokens.idle": "Tokens: --",
    "status.tokens.active": "Tokens: {used} / {limit} ({remaining} übrig)",
    "status.memory": "Speicher: {used} / {limit} MB",
    "status.memory.idle": "Speicher: --",
    "status.token.warning.caution":
      "Kontextnutzung nähert sich dem Limit ({percent}%). Erwägen Sie, den Chat zu löschen.",
    "status.token.warning.warning":
      "Kontext fast voll ({percent}%). Chat löschen, um fortzufahren.",
    "status.token.warning.critical":
      "Kontext voll ({percent}%). Chat sofort löschen.",
    "status.token.warning.clearChat": "Chat löschen",

    "modal.loading.title": "Modelle werden geladen",
    "modal.loading.description":
      "KI-Modelle werden heruntergeladen und initialisiert...",
    "modal.loading.step.embedding": "Embedding-Modell (Qwen3-Embedding-0.6B)",
    "modal.loading.step.llm": "Sprachmodell (Qwen3.5-2B)",
    "modal.loading.done": "fertig",
    "modal.loading.ready": "bereit",
    "modal.loading.initializing": "wird initialisiert",
    "modal.loading.overall": "Gesamt: {percent}%",

    "sidebar.documents": "Dokumente",
    "sidebar.tooltip.embeddingRequired":
      "Laden Sie zuerst das Embedding-Modell, um Datei-Uploads zu ermöglichen.",
    "sidebar.upload.files": "Dateien hochladen",
    "sidebar.btn.loadModels": "Modelle laden",
    "sidebar.btn.unloadEmbedding": "Embedding-Modell entladen",
    "sidebar.btn.unloadLlm": "LLM entladen",
    "sidebar.btn.clearChat": "Chat löschen",

    "db.export": "Datenbank exportieren",
    "db.import": "Datenbank importieren",
    "db.clear": "Datenbank leeren",

    "chat.placeholder": "Stellen Sie eine Frage zu Ihren Dokumenten...",
    "chat.tooltip.queryDisabled":
      "Laden Sie zuerst die relevanten Modelle, um Abfragen zu ermöglichen.",
    "chat.send": "Senden",
    "chat.stop": "Stoppen",

    "phase.embedding": "Abfrage wird eingebettet...",
    "phase.searching": "Dokumente werden durchsucht...",
    "phase.generating": "Antwort wird generiert...",
    "phase.generating_composing": "Antwort wird formuliert...",
    "phase.generating_finalizing": "Antwort wird abgeschlossen...",
    "phase.generating_thinking": "Denken...",
    "phase.generating_formulating": "Antwort wird ausgearbeitet...",

    "notif.loadingEmbedding": "Embedding-Modell wird geladen...",
    "notif.failedEmbedding":
      "Embedding-Modell konnte nicht geladen werden: {error}",
    "notif.failedLlm": "LLM konnte nicht geladen werden: {error}",
    "notif.modelsLoaded": "Modelle erfolgreich geladen",
    "notif.generating": "Antwort wird generiert...",
    "notif.stopped": "Antwort vom Benutzer gestoppt",
    "notif.chatCleared": "Chatverlauf gelöscht",
    "notif.dbExported": "Datenbank erfolgreich exportiert",
    "notif.dbImported":
      "Datenbank erfolgreich importiert ({count} Chunks hinzugefügt)",
    "notif.dbCleared": "Datenbank geleert",
    "notif.dbMergeConfirm":
      "{imported} Chunks aus Datei in bestehende {existing} Chunks übernehmen?",
    "notif.settingsReset": "Einstellungen auf Werkseinstellungen zurückgesetzt",
    "notif.llmSettingsReset":
      "LLM-Einstellungen auf Voreinstellung zurückgesetzt",
    "notif.fileIndexed": "{file} erfolgreich indiziert",
    "notif.fileIndexFailed": "Indizierung von {file} fehlgeschlagen: {error}",
    "notif.noDocuments":
      "Bitte laden Sie zuerst Dokumente hoch, damit ich Ihre Fragen beantworten kann.",
    "notif.queryFailed": "Abfrage fehlgeschlagen: {error}",
    "notif.embeddingUnloaded": "Embedding-Modell entladen",
    "notif.reloadLlmFailed":
      "LLM konnte nach Entladen des Embedding-Modells nicht neu geladen werden",
    "notif.llmUnloaded": "LLM entladen",
    "notif.reloadEmbeddingFailed":
      "Embedding-Modell konnte nach Entladen des LLM nicht neu geladen werden",
    "notif.dbClearedWithCount": "Datenbank geleert ({count} Chunks entfernt)",
    "notif.noDataExport":
      "Keine Daten zum Exportieren. Laden Sie zuerst Dokumente hoch.",
    "notif.exported": "{count} Chunks nach {filename} exportiert",
    "notif.exportFailed": "Export fehlgeschlagen: {error}",
    "notif.invalidFileType":
      "Ungültiger Dateityp. Bitte wählen Sie eine .json-Exportdatei aus.",
    "notif.importValidationFailed":
      "Import-Validierung fehlgeschlagen: {error}",
    "notif.importCancelled": "Import abgebrochen.",
    "notif.imported": "{count} Chunks aus {file} importiert",
    "notif.invalidJson": "Import fehlgeschlagen: Datei ist kein gültiges JSON.",
    "notif.importFailed": "Import fehlgeschlagen: {error}",
    "notif.dbClearConfirm":
      "Dies wird alle indizierten Daten ({count} Chunks) endgültig löschen.",
    "notif.cannotUndo":
      "Diese Aktion kann nicht rückgängig gemacht werden. Fortsetzen?",
    "notif.importReplaceConfirm":
      "Dies wird Ihre aktuelle Datenbank ({current} Chunks) durch die importierte ({imported} Chunks) ERSETZEN.\n\nFortsetzen?",

    "settings.search.title": "Sucheinstellungen",
    "settings.search.mode": "Suchmodus",
    "settings.search.mode.hybrid": "Hybrid (Empfohlen)",
    "settings.search.mode.vector": "Nur Vektor",
    "settings.search.balance": "Stichwort vs. semantische Balance",
    "settings.search.bm25": "BM25: {value}%",
    "settings.search.vector": "Vektor: {value}%",
    "settings.similarityThresholds": "Ähnlichkeitsschwellenwerte",
    "settings.hybridScore": "Hybrid-Wert",
    "settings.vectorGate": "Vektor-Gate",
    "settings.vectorSimilarity": "Vektorähnlichkeit",
    "settings.maxResults": "Max. Ergebnisse (Top-N)",
    "settings.btn.resetDefaults": "Auf Standard zurücksetzen",

    "settings.llm.title": "LLM-Einstellungen",
    "settings.llm.thinking": "Denken aktivieren",
    "settings.llm.thinkingDesc":
      "Das Modell denkt vor der Beantwortung nach. Nützlich für komplexe Probleme, aber langsamer und verbraucht mehr Tokens.",
    "settings.llm.maxThinkingTokens": "Max. Denk-Tokens",
    "settings.llm.maxThinkingTokensDesc":
      "Maximale Tokens für den internen Denkprozess des Modells. Niedrigere Werte = schneller, höhere Werte = tiefgründigere Analyse.",
    "settings.llm.genParams": "Generierungsparameter",
    "settings.llm.genParamsDesc":
      "Werte passen sich automatisch beim Wechsel des Denkmodus an. Manuelle Überschreibungen sind möglich.",
    "settings.llm.temperature": "Temperatur",
    "settings.llm.topP": "Top-p",
    "settings.llm.topK": "Top-k",
    "settings.llm.minP": "Min-p",
    "settings.llm.presencePenalty": "Präsenz-Strafe",
    "settings.llm.repetitionPenalty": "Wiederholungs-Strafe",
    "settings.llm.maxNewTokens": "Max. neue Tokens",
    "settings.llm.btn.resetPreset": "Auf Voreinstellung zurücksetzen",

    "doc.chunks": "{count} Chunks",

    "citation.similarity": "Ähnlichkeit: {percent}%",
    "citation.chunk": "(Chunk {index})",

    "status.modelState.ready": "bereit",
    "status.modelState.loading": "lädt",
    "status.modelState.unloaded": "nicht geladen",

    "tooltip.theme": "Design wechseln",
    "tooltip.help": "Über diese App",

    "lang.tooltip": "Sprache auswählen",

    // App messages
    "app.restoredIndexedDb": "Wiederhergestellt aus IndexedDB",

    // Chat placeholder
    "chat.empty": "Lade einige Dokumente hoch und stelle eine Frage dazu.",

    // Notifications
    "notif.fileSkipped.doc":
      "Überspringe {file}: .doc (binär) wird nicht unterstützt. Bitte erst in .docx oder .txt konvertieren.",
    "notif.fileSkipped.ppt":
      "Überspringe {file}: .ppt (binär) wird nicht unterstützt. Bitte erst in .pptx oder .txt konvertieren.",
    "notif.fileSkipped.other":
      "Überspringe {file}: nicht unterstütztes Format. Unterstützt: {formats}",

    // Help modal — Overview
    "help.title": "RAG-Browser &mdash; Über",
    "help.overview.title": "Übersicht",
    "help.overview.description":
      "Eine vollständig clientseitige, browserbasierte <strong>Retrieval-Augmented Generation (RAG)</strong>-Agentur. Lade Dokumente hoch (<code>.txt</code>, <code>.md</code>, <code>.csv</code>, <code>.xls</code>, <code>.xlsx</code>, <code>.docx</code>, <code>.pptx</code>, <code>.odt</code>, <code>.ods</code>, <code>.odp</code>, <code>.pdf</code>), erstelle lokale Embeddings und stelle Fragen – alles ohne Server, API-Keys oder Cloud-Infrastruktur.",
    "help.overview.privacy":
      "<strong>Keine Benutzerdaten verlassen jemals Ihr Gerät.</strong> Die Inferenz läuft lokal in Ihrem Browser.",
    "help.architecture.title": "Architektur",
    "help.storage.title": "Modellspeicher &amp; Cache",
    "help.storage.whereTitle": "Wo wird das Modell gespeichert?",
    "help.storage.whereDesc":
      "Die Modelle werden im Speicher Ihres Browsers zwischengespeichert:",
    "help.storage.step1":
      "Öffnen Sie die Entwicklertools (<kbd>F12</kbd> oder <kbd>Ctrl+Shift+I</kbd>)",
    "help.storage.step2":
      "Wechseln Sie zum Reiter <strong>Application</strong>",
    "help.storage.step3":
      "Erweitern Sie <strong>Storage &rarr; IndexedDB</strong>",
    "help.storage.step4":
      "Suchen Sie nach Datenbanken mit <em>transformers</em> oder <em>huggingface</em>",
    "help.storage.step5":
      "Modelldateien werden im <strong>Cache Storage</strong> unter <em>transformers-cache</em> gespeichert",
    "help.storage.deleteTitle": "Wie löscht man den Modellcache?",
    "help.storage.method1":
      "<strong>Methode 1 – Über Entwicklertools:</strong>",
    "help.storage.m1Step1": "Öffnen Sie die Entwicklertools (<kbd>F12</kbd>)",
    "help.storage.m1Step2":
      "Wechseln Sie zum Reiter <strong>Application</strong>",
    "help.storage.m1Step3":
      "Klicken Sie auf <strong>Storage &rarr; Clear storage</strong>",
    "help.storage.m1Step4":
      "Wählen Sie <strong>Cache storage</strong> und <strong>IndexedDB</strong>",
    "help.storage.m1Step5": "Klicken Sie auf <strong>Clear site data</strong>",
    "help.storage.method2":
      "<strong>Methode 2 – Über Browser-Einstellungen:</strong>",
    "help.storage.m2Step1":
      "Gehen Sie zu <strong>Einstellungen &rarr; Datenschutz &amp; Sicherheit</strong>",
    "help.storage.m2Step2": "Klicken Sie auf <strong>Daten löschen</strong>",
    "help.storage.m2Step3":
      "Wählen Sie <strong>Gecachte Bilder und Dateien</strong>",
    "help.storage.m2Step4": "Zeitrahmen wählen und löschen",
    "help.storage.method3": "<strong>Methode 3 – Über die Konsole:</strong>",
    "help.storage.m3Step1":
      "Öffnen Sie die <strong>Konsole</strong> in den Entwicklertools",
    "help.storage.m3Step2":
      "Ausführen: <code>caches.keys().then(keys => keys.forEach(k => caches.delete(k)))</code>",
    "help.webgpu.title": "WebGPU aktivieren",
    "help.webgpu.warning":
      "<strong>Wichtig:</strong> WebGPU verbessert die Leistung erheblich. Ohne es läuft das Modell auf der CPU, was bis zu <strong>10–50&times; langsamer</strong> sein kann.",
    "help.webgpu.chromeTitle": "Google Chrome &amp; Microsoft Edge (Chromium)",
    "help.webgpu.chromeDesc":
      "WebGPU ist ab Chrome 113 und Edge 113 standardmäßig aktiviert. Falls nicht:",
    "help.webgpu.chromeStep1":
      "Navigieren Sie zu <code>chrome://flags</code> (oder <code>edge://flags</code>)",
    "help.webgpu.chromeStep2": "Suchen Sie nach <strong>WebGPU</strong>",
    "help.webgpu.chromeStep3":
      "Setzen Sie <strong>Unsafe WebGPU</strong> auf <em>Aktiviert</em>",
    "help.webgpu.chromeStep4": "Klicken Sie auf <strong>Neustart</strong>",
    "help.webgpu.chromeCmd":
      "<strong>Befehlszeilen-Alternative:</strong> <code>--enable-unsafe-webgpu</code>",
    "help.webgpu.firefoxTitle": "Mozilla Firefox",
    "help.webgpu.firefoxDesc":
      "WebGPU ist ab Firefox 141+ (Windows) und 145+ (macOS) standardmäßig aktiviert. Manuelles Aktivieren:",
    "help.webgpu.firefoxStep1":
      "Geben Sie <code>about:config</code> in die Adressleiste ein und akzeptieren Sie die Warnung",
    "help.webgpu.firefoxStep2":
      "Suchen Sie nach <strong><code>dom.webgpu.enabled</code></strong>",
    "help.webgpu.firefoxStep3": "Auf <strong>true</strong> setzen",
    "help.webgpu.firefoxStep4":
      "Optional <strong><code>gfx.webgpu.ignore-blocklist</code></strong> auf <strong>true</strong> setzen, falls blockiert",
    "help.webgpu.safariTitle": "Safari",
    "help.webgpu.safariDesc":
      "WebGPU ist ab Safari 26 (macOS Tahoe 26, iOS 26) standardmäßig aktiviert. Frühere Versionen benötigen Safari Technology Preview.",
    "help.webgpu.linuxTitle": "Linux (Chrome/Chromium)",
    "help.webgpu.linuxDesc": "Starten mit folgenden Flags:",
    "help.webgpu.linuxExtra":
      "<em>Stellen Sie sicher, dass Ihre Grafiktreiber aktuell sind. Sie können auch <code>--ozone-platform=x11</code> statt Wayland versuchen.</em>",
    "help.webgpu.tableTitle": "Browser-Support-Zusammenfassung",
    "help.webgpu.tableBrowser": "Browser",
    "help.webgpu.tableStatus": "Status",
    "help.webgpu.tableEnable": "Aktivieren",
    "help.webgpu.tips":
      "<strong>Tipp:</strong> Stellen Sie sicher, dass Hardwarebeschleunigung in Ihren Browser-Einstellungen aktiviert ist. Halten Sie Ihre Grafiktreiber auf dem neuesten Stand.",
    "help.license.title": "Lizenz",
    "help.license.desc":
      "Dieses Projekt wird für persönliche und Forschungszwecke bereitgestellt.",
    "help.license.thirdParty": "Drittanbieter-Modelle",
    "help.license.thirdPartyDesc":
      "Diese Anwendung verwendet die folgenden Modelle, lizenziert unter Apache License 2.0:",
    "help.license.seeLicense":
      'Siehe <a href="https://www.apache.org/licenses/LICENSE-2.0" target="_blank" rel="noopener">Apache License 2.0</a> für vollständige Bedingungen.',
  },

  // ─── Italian ────────────────────────────────────────────────
  it: {
    "status.hardware.detecting": "Rilevamento hardware...",
    "status.hardware.gpu": "WebGPU ({device})",
    "status.hardware.cpu": "WASM ({device})",
    "status.models.unloaded": "Modelli: non caricati",
    "status.models.embedding": "Modelli: embedding",
    "status.models.llm": "Modelli: LLM",
    "status.models.both": "Modelli: entrambi pronti",
    "status.models.summary": "Embedding: {emb} | LLM: {llm}",
    "status.index": "Indice: {chunks} chunk, {docs} documenti",
    "status.tokens": "Token: {input} in / {output} out",
    "status.tokens.idle": "Token: --",
    "status.tokens.active": "Token: {used} / {limit} ({remaining} rimanenti)",
    "status.memory": "Memoria: {used} / {limit} MB",
    "status.memory.idle": "Memoria: --",
    "status.token.warning.caution":
      "Utilizzo del contesto vicino al limite ({percent}%). Considera di cancellare la chat.",
    "status.token.warning.warning":
      "Contesto quasi pieno ({percent}%). Cancella la chat per continuare.",
    "status.token.warning.critical":
      "Contesto pieno ({percent}%). Cancella subito la chat.",
    "status.token.warning.clearChat": "Cancella Chat",

    "modal.loading.title": "Caricamento Modelli",
    "modal.loading.description":
      "Download e inizializzazione dei modelli AI...",
    "modal.loading.step.embedding": "Modello Embedding (Qwen3-Embedding-0.6B)",
    "modal.loading.step.llm": "Modello Linguistico (Qwen3.5-2B)",
    "modal.loading.done": "fatto",
    "modal.loading.ready": "pronto",
    "modal.loading.initializing": "inizializzazione",
    "modal.loading.overall": "Totale: {percent}%",

    "sidebar.documents": "Documenti",
    "sidebar.tooltip.embeddingRequired":
      "Carica prima il modello embedding per abilitare il caricamento file.",
    "sidebar.upload.files": "Carica file",
    "sidebar.btn.loadModels": "Carica Modelli",
    "sidebar.btn.unloadEmbedding": "Scarica Modello Embedding",
    "sidebar.btn.unloadLlm": "Scarica LLM",
    "sidebar.btn.clearChat": "Cancella Chat",

    "db.export": "Esporta Database",
    "db.import": "Importa Database",
    "db.clear": "Cancella Database",

    "chat.placeholder": "Fai una domanda sui tuoi documenti...",
    "chat.tooltip.queryDisabled":
      "Carica prima i modelli rilevanti per abilitare le query.",
    "chat.send": "Invia",
    "chat.stop": "Ferma",

    "phase.embedding": "Incorporazione query...",
    "phase.searching": "Ricerca documenti...",
    "phase.generating": "Generazione risposta...",
    "phase.generating_composing": "Composizione risposta...",
    "phase.generating_finalizing": "Finalizzazione risposta...",
    "phase.generating_thinking": "Ragionamento...",
    "phase.generating_formulating": "Formulazione risposta...",

    "notif.loadingEmbedding": "Caricamento modello embedding...",
    "notif.failedEmbedding":
      "Impossibile caricare il modello embedding: {error}",
    "notif.failedLlm": "Impossibile caricare il LLM: {error}",
    "notif.modelsLoaded": "Modelli caricati con successo",
    "notif.generating": "Generazione risposta...",
    "notif.stopped": "Risposta interrotta dall'utente",
    "notif.chatCleared": "Cronologia chat cancellata",
    "notif.dbExported": "Database esportato con successo",
    "notif.dbImported":
      "Database importato con successo ({count} chunk aggiunti)",
    "notif.dbCleared": "Database cancellato",
    "notif.dbMergeConfirm":
      "Unire {imported} chunk dal file ai {existing} chunk esistenti?",
    "notif.settingsReset": "Impostazioni ripristinate ai valori predefiniti",
    "notif.llmSettingsReset": "Impostazioni LLM ripristinate alle preset",
    "notif.fileIndexed": "{file} indicizzato con successo",
    "notif.fileIndexFailed": "Indicizzazione di {file} fallita: {error}",
    "notif.noDocuments":
      "Carica prima alcuni documenti così ho il contesto per rispondere.",
    "notif.queryFailed": "Query fallita: {error}",
    "notif.embeddingUnloaded": "Modello embedding scaricato",
    "notif.reloadLlmFailed":
      "Impossibile ricaricare il LLM dopo lo scaricamento del modello embedding",
    "notif.llmUnloaded": "LLM scaricato",
    "notif.reloadEmbeddingFailed":
      "Impossibile ricaricare il modello embedding dopo lo scaricamento del LLM",
    "notif.dbClearedWithCount": "Database cancellato ({count} chunk rimossi)",
    "notif.noDataExport":
      "Nessun dato da esportare. Carica e indizza prima i documenti.",
    "notif.exported": "{count} chunk esportati in {filename}",
    "notif.exportFailed": "Esportazione fallita: {error}",
    "notif.invalidFileType":
      "Tipo di file non valido. Seleziona un file di esportazione .json.",
    "notif.importValidationFailed": "Validazione import fallita: {error}",
    "notif.importCancelled": "Import annullato.",
    "notif.imported": "{count} chunk importati da {file}",
    "notif.invalidJson": "Import fallito: il file non è un JSON valido.",
    "notif.importFailed": "Import fallito: {error}",
    "notif.dbClearConfirm":
      "Questo eliminerà permanentemente tutti i dati indicizzati ({count} chunk).",
    "notif.cannotUndo": "Questa azione non può essere annullata. Continuare?",
    "notif.importReplaceConfirm":
      "Questo SOSTITUISCerà il tuo database corrente ({current} chunk) con quello importato ({imported} chunk).\n\nContinuare?",

    "settings.search.title": "Impostazioni Ricerca",
    "settings.search.mode": "Modalità Ricerca",
    "settings.search.mode.hybrid": "Ibrida (Consigliata)",
    "settings.search.mode.vector": "Solo Vettore",
    "settings.search.balance": "Bilanciamento Parola vs Semantico",
    "settings.search.bm25": "BM25: {value}%",
    "settings.search.vector": "Vettore: {value}%",
    "settings.similarityThresholds": "Soglie di Similarità",
    "settings.hybridScore": "Punteggio Ibrido",
    "settings.vectorGate": "Soglia Vettore",
    "settings.vectorSimilarity": "Similarità Vettoriale",
    "settings.maxResults": "Risultati Max (Top-N)",
    "settings.btn.resetDefaults": "Ripristina Predefiniti",

    "settings.llm.title": "Impostazioni LLM",
    "settings.llm.thinking": "Abilita Ragionamento",
    "settings.llm.thinkingDesc":
      "Il modello ragiona prima di rispondere. Utile per problemi complessi ma più lento e consuma più token.",
    "settings.llm.maxThinkingTokens": "Token Max Ragionamento",
    "settings.llm.maxThinkingTokensDesc":
      "Token massimi allocati al processo di ragionamento interno. Valori più bassi = più veloce, valori più alti = analisi più profonda.",
    "settings.llm.genParams": "Parametri di Generazione",
    "settings.llm.genParamsDesc":
      "I valori si adattano automaticamente cambiando modalità. Sono consentite sovrascritture manuali.",
    "settings.llm.temperature": "Temperatura",
    "settings.llm.topP": "Top-p",
    "settings.llm.topK": "Top-k",
    "settings.llm.minP": "Min-p",
    "settings.llm.presencePenalty": "Penalità di Presenza",
    "settings.llm.repetitionPenalty": "Penalità di Ripetizione",
    "settings.llm.maxNewTokens": "Token Max Nuovi",
    "settings.llm.btn.resetPreset": "Ripristina Preset",

    "doc.chunks": "{count} chunk",

    "citation.similarity": "Similarità: {percent}%",
    "citation.chunk": "(chunk {index})",

    "status.modelState.ready": "pronto",
    "status.modelState.loading": "caricamento",
    "status.modelState.unloaded": "non caricato",

    "tooltip.theme": "Cambia tema",
    "tooltip.help": "Info su questa app",

    "lang.tooltip": "Seleziona lingua",

    // App messages
    "app.restoredIndexedDb": "Ripristinato da IndexedDB",

    // Chat placeholder
    "chat.empty": "Carica alcuni documenti, poi fai una domanda.",

    // Notifications
    "notif.fileSkipped.doc":
      "Salto {file}: .doc (binario) non supportato nel browser. Converti prima in .docx o .txt.",
    "notif.fileSkipped.ppt":
      "Salto {file}: .ppt (binario) non supportato nel browser. Converti prima in .pptx o .txt.",
    "notif.fileSkipped.other":
      "Salto {file}: formato non supportato. Supportati: {formats}",
    "notif.failedLlm": "Caricamento LLM fallito: {error}",

    // Help modal — Overview
    "help.title": "RAG-Browser &mdash; Informazioni",
    "help.overview.title": "Panoramica",
    "help.overview.description":
      "Un agente <strong>Retrieval-Augmented Generation (RAG)</strong> completamente lato client nel browser. Carica documenti (<code>.txt</code>, <code>.md</code>, <code>.csv</code>, <code>.xls</code>, <code>.xlsx</code>, <code>.docx</code>, <code>.pptx</code>, <code>.odt</code>, <code>.ods</code>, <code>.odp</code>, <code>.pdf</code>), crea embedding locali e consulta conversazionalmente &mdash; tutto senza server, chiavi API o infrastrutture cloud.",
    "help.overview.privacy":
      "<strong>Nessun dato utente lascia mai il tuo dispositivo.</strong> Tutta l'inferenza viene eseguita localmente nel browser.",
    "help.architecture.title": "Architettura",
    "help.storage.title": "Archiviazione e Cache dei Modelli",
    "help.storage.whereTitle": "Dove viene memorizzato il modello?",
    "help.storage.whereDesc":
      "I modelli sono in cache nell'archiviazione del browser:",
    "help.storage.step1":
      "Apri gli strumenti di sviluppo (<kbd>F12</kbd> o <kbd>Ctrl+Shift+I</kbd>)",
    "help.storage.step2": "Vai alla scheda <strong>Application</strong>",
    "help.storage.step3": "Espandi <strong>Storage &rarr; IndexedDB</strong>",
    "help.storage.step4":
      "Cerca database contenenti <em>transformers</em> o <em>huggingface</em>",
    "help.storage.step5":
      "I file del modello sono memorizzati in <strong>Cache Storage</strong> sotto <em>transformers-cache</em>",
    "help.storage.deleteTitle": "Come eliminare la cache del modello?",
    "help.storage.method1":
      "<strong>Metodo 1 &mdash; Tramite strumenti di sviluppo:</strong>",
    "help.storage.m1Step1": "Apri gli strumenti di sviluppo (<kbd>F12</kbd>)",
    "help.storage.m1Step2": "Vai alla scheda <strong>Application</strong>",
    "help.storage.m1Step3":
      "Clicca <strong>Storage &rarr; Clear storage</strong>",
    "help.storage.m1Step4":
      "Seleziona <strong>Cache storage</strong> e <strong>IndexedDB</strong>",
    "help.storage.m1Step5": "Clicca <strong>Clear site data</strong>",
    "help.storage.method2":
      "<strong>Metodo 2 &mdash; Tramite impostazioni del browser:</strong>",
    "help.storage.m2Step1":
      "Vai a <strong>Impostazioni &rarr; Privacy e sicurezza</strong>",
    "help.storage.m2Step2":
      "Clicca <strong>Cancella dati di navigazione</strong>",
    "help.storage.m2Step3":
      "Seleziona <strong>Immagini e file in cache</strong>",
    "help.storage.m2Step4": "Scegli l'intervallo di tempo e cancella",
    "help.storage.method3":
      "<strong>Metodo 3 &mdash; Tramite console:</strong>",
    "help.storage.m3Step1":
      "Apri <strong>Console</strong> negli strumenti di sviluppo",
    "help.storage.m3Step2":
      "Esegui: <code>caches.keys().then(keys => keys.forEach(k => caches.delete(k)))</code>",
    "help.webgpu.title": "Abilita WebGPU",
    "help.webgpu.warning":
      "<strong>Importante:</strong> WebGPU migliora notevolmente le prestazioni. Senza di esso, il modello gira sulla CPU ed può essere <strong>10–50&times; più lento</strong>.",
    "help.webgpu.chromeTitle": "Google Chrome e Microsoft Edge (Chromium)",
    "help.webgpu.chromeDesc":
      "WebGPU è abilitato per impostazione predefinita da Chrome 113 e Edge 113. Se non disponibile:",
    "help.webgpu.chromeStep1":
      "Vai a <code>chrome://flags</code> (o <code>edge://flags</code>)",
    "help.webgpu.chromeStep2": "Cerca <strong>WebGPU</strong>",
    "help.webgpu.chromeStep3":
      "Imposta <strong>Unsafe WebGPU</strong> su <em>Abilitato</em>",
    "help.webgpu.chromeStep4": "Clicca <strong>Riavvia</strong>",
    "help.webgpu.chromeCmd":
      "<strong>Alternativa da riga di comando:</strong> <code>--enable-unsafe-webgpu</code>",
    "help.webgpu.firefoxTitle": "Mozilla Firefox",
    "help.webgpu.firefoxDesc":
      "WebGPU è abilitato per impostazione predefinita da Firefox 141+ (Windows) e 145+ (macOS). Per abilitare manualmente:",
    "help.webgpu.firefoxStep1":
      "Digita <code>about:config</code> nella barra degli indirizzi e accetta l'avviso",
    "help.webgpu.firefoxStep2":
      "Cerca <strong><code>dom.webgpu.enabled</code></strong>",
    "help.webgpu.firefoxStep3": "Imposta su <strong>true</strong>",
    "help.webgpu.firefoxStep4":
      "Opzionalmente imposta <strong><code>gfx.webgpu.ignore-blocklist</code></strong> su <strong>true</strong> se bloccato",
    "help.webgpu.safariTitle": "Safari",
    "help.webgpu.safariDesc":
      "WebGPU è abilitato per impostazione predefinita da Safari 26 (macOS Tahoe 26, iOS 26). Le versioni precedenti richiedono Safari Technology Preview.",
    "help.webgpu.linuxTitle": "Linux (Chrome/Chromium)",
    "help.webgpu.linuxDesc": "Avvia con i seguenti flag:",
    "help.webgpu.linuxExtra":
      "<em>Assicurati che i driver grafici siano aggiornati. Puoi anche provare <code>--ozone-platform=x11</code> invece di Wayland.</em>",
    "help.webgpu.tableTitle": "Riepilogo Supporto Browser",
    "help.webgpu.tableBrowser": "Browser",
    "help.webgpu.tableStatus": "Stato",
    "help.webgpu.tableEnable": "Come Abilitare",
    "help.webgpu.tips":
      "<strong>Suggerimenti:</strong> Assicurati che l'accelerazione hardware sia abilitata nelle impostazioni del browser. Tieni aggiornati i driver GPU per le migliori prestazioni.",
    "help.license.title": "Licenza",
    "help.license.desc":
      "Questo progetto è fornito così com'è per uso personale e di ricerca.",
    "help.license.thirdParty": "Modelli di Terze Parti",
    "help.license.thirdPartyDesc":
      "Questa applicazione incorpora i seguenti modelli, licenziati sotto Apache License 2.0:",
    "help.license.seeLicense":
      'Vedi <a href="https://www.apache.org/licenses/LICENSE-2.0" target="_blank" rel="noopener">Apache License 2.0</a> per i termini completi.',
  },

  // ─── Spanish ────────────────────────────────────────────────
  es: {
    "status.hardware.detecting": "Detectando hardware...",
    "status.hardware.gpu": "WebGPU ({device})",
    "status.hardware.cpu": "WASM ({device})",
    "status.models.unloaded": "Modelos: no cargados",
    "status.models.embedding": "Modelos: embedding",
    "status.models.llm": "Modelos: LLM",
    "status.models.both": "Modelos: ambos listos",
    "status.models.summary": "Embedding: {emb} | LLM: {llm}",
    "status.index": "Índice: {chunks} fragmentos, {docs} documentos",
    "status.tokens": "Tokens: {input} ent / {output} sal",
    "status.tokens.idle": "Tokens: --",
    "status.tokens.active": "Tokens: {used} / {limit} ({remaining} restantes)",
    "status.memory": "Memoria: {used} / {limit} MB",
    "status.memory.idle": "Memoria: --",
    "status.token.warning.caution":
      "Uso del contexto cerca del límite ({percent}%). Considere borrar el chat.",
    "status.token.warning.warning":
      "Contexto casi lleno ({percent}%). Borre el chat para continuar.",
    "status.token.warning.critical":
      "Contexto lleno ({percent}%). Borre el chat inmediatamente.",
    "status.token.warning.clearChat": "Borrar Chat",

    "modal.loading.title": "Cargando Modelos",
    "modal.loading.description": "Descargando e inicializando modelos de IA...",
    "modal.loading.step.embedding":
      "Modelo de Embedding (Qwen3-Embedding-0.6B)",
    "modal.loading.step.llm": "Modelo de Lenguaje (Qwen3.5-2B)",
    "modal.loading.done": "listo",
    "modal.loading.ready": "listo",
    "modal.loading.initializing": "inicializando",
    "modal.loading.overall": "Total: {percent}%",

    "sidebar.documents": "Documentos",
    "sidebar.tooltip.embeddingRequired":
      "Cargue primero el modelo de embedding para habilitar la carga de archivos.",
    "sidebar.upload.files": "Subir archivos",
    "sidebar.btn.loadModels": "Cargar Modelos",
    "sidebar.btn.unloadEmbedding": "Descargar Modelo Embedding",
    "sidebar.btn.unloadLlm": "Descargar LLM",
    "sidebar.btn.clearChat": "Borrar Chat",

    "db.export": "Exportar Base de Datos",
    "db.import": "Importar Base de Datos",
    "db.clear": "Limpiar Base de Datos",

    "chat.placeholder": "Pregunte sobre sus documentos...",
    "chat.tooltip.queryDisabled":
      "Cargue primero los modelos relevantes para habilitar las consultas.",
    "chat.send": "Enviar",
    "chat.stop": "Detener",

    "phase.embedding": "Incrustando consulta...",
    "phase.searching": "Buscando documentos...",
    "phase.generating": "Generando respuesta...",
    "phase.generating_composing": "Componiendo respuesta...",
    "phase.generating_finalizing": "Finalizando respuesta...",
    "phase.generating_thinking": "Pensando...",
    "phase.generating_formulating": "Formulando respuesta...",

    "notif.loadingEmbedding": "Cargando modelo de embedding...",
    "notif.failedEmbedding": "Error al cargar modelo de embedding: {error}",
    "notif.failedLlm": "Error al cargar LLM: {error}",
    "notif.modelsLoaded": "Modelos cargados correctamente",
    "notif.generating": "Generando respuesta...",
    "notif.stopped": "Respuesta detenida por el usuario",
    "notif.chatCleared": "Historial de chat borrado",
    "notif.dbExported": "Base de datos exportada correctamente",
    "notif.dbImported":
      "Base de datos importada correctamente ({count} fragmentos añadidos)",
    "notif.dbCleared": "Base de datos limpiada",
    "notif.dbMergeConfirm":
      "¿Fusionar {imported} fragmentos del archivo en los {existing} fragmentos existentes?",
    "notif.settingsReset":
      "Configuración restablecida a valores predeterminados",
    "notif.llmSettingsReset": "Configuración LLM restablecida a preset",
    "notif.fileIndexed": "{file} indexado correctamente",
    "notif.fileIndexFailed": "Error al indexar {file}: {error}",
    "notif.noDocuments":
      "Suba algunos documentos primero para que tenga contexto para responder.",
    "notif.queryFailed": "Consulta fallida: {error}",
    "notif.embeddingUnloaded": "Modelo de embedding descargado",
    "notif.reloadLlmFailed":
      "Error al recargar LLM después de descargar el modelo de embedding",
    "notif.llmUnloaded": "LLM descargado",
    "notif.reloadEmbeddingFailed":
      "Error al recargar el modelo de embedding después de descargar el LLM",
    "notif.dbClearedWithCount":
      "Base de datos limpiada ({count} fragmentos eliminados)",
    "notif.noDataExport":
      "No hay datos para exportar. Suba e indexe documentos primero.",
    "notif.exported": "{count} fragmentos exportados a {filename}",
    "notif.exportFailed": "Exportación fallida: {error}",
    "notif.invalidFileType":
      "Tipo de archivo inválido. Seleccione un archivo de exportación .json.",
    "notif.importValidationFailed": "Validación de import fallida: {error}",
    "notif.importCancelled": "Import cancelado.",
    "notif.imported": "{count} fragmentos importados desde {file}",
    "notif.invalidJson": "Import fallido: el archivo no es JSON válido.",
    "notif.importFailed": "Import fallido: {error}",
    "notif.dbClearConfirm":
      "Esto eliminará permanentemente todos los datos indexados ({count} fragmentos).",
    "notif.cannotUndo": "Esta acción no se puede deshacer. ¿Continuar?",
    "notif.importReplaceConfirm":
      "Esto REEMPLAZARÁ su base de datos actual ({current} fragmentos) con la importada ({imported} fragmentos).\n\n¿Continuar?",

    "settings.search.title": "Configuración de Búsqueda",
    "settings.search.mode": "Modo de Búsqueda",
    "settings.search.mode.hybrid": "Híbrido (Recomendado)",
    "settings.search.mode.vector": "Solo Vectorial",
    "settings.search.balance": "Equilibrio Palabra vs Semántico",
    "settings.search.bm25": "BM25: {value}%",
    "settings.search.vector": "Vectorial: {value}%",
    "settings.similarityThresholds": "Umbrales de Similitud",
    "settings.hybridScore": "Puntuación Híbrida",
    "settings.vectorGate": "Puerta Vectorial",
    "settings.vectorSimilarity": "Similitud Vectorial",
    "settings.maxResults": "Resultados Máximos (Top-N)",
    "settings.btn.resetDefaults": "Restablecer Predeterminados",

    "settings.llm.title": "Configuración LLM",
    "settings.llm.thinking": "Habilitar Razonamiento",
    "settings.llm.thinkingDesc":
      "El modelo razona antes de responder. Útil para problemas complejos pero más lento y consume más tokens.",
    "settings.llm.maxThinkingTokens": "Tokens Máx. de Razonamiento",
    "settings.llm.maxThinkingTokensDesc":
      "Tokens máximos asignados al proceso interno de razonamiento. Valores bajos = más rápido, valores altos = análisis más profundo.",
    "settings.llm.genParams": "Parámetros de Generación",
    "settings.llm.genParamsDesc":
      "Los valores se ajustan automáticamente al cambiar el modo. Se permiten sobrescrituras manuales.",
    "settings.llm.temperature": "Temperatura",
    "settings.llm.topP": "Top-p",
    "settings.llm.topK": "Top-k",
    "settings.llm.minP": "Min-p",
    "settings.llm.presencePenalty": "Penalización de Presencia",
    "settings.llm.repetitionPenalty": "Penalización de Repetición",
    "settings.llm.maxNewTokens": "Tokens Máx. Nuevos",
    "settings.llm.btn.resetPreset": "Restablecer Preset",

    "doc.chunks": "{count} fragmentos",

    "citation.similarity": "Similitud: {percent}%",
    "citation.chunk": "(fragmento {index})",

    "status.modelState.ready": "listo",
    "status.modelState.loading": "cargando",
    "status.modelState.unloaded": "no cargado",

    "tooltip.theme": "Cambiar tema",
    "tooltip.help": "Acerca de esta app",

    "lang.tooltip": "Seleccionar idioma",

    // App messages
    "app.restoredIndexedDb": "Restaurado desde IndexedDB",

    // Chat placeholder
    "chat.empty":
      "Suba algunos documentos y luego haga una pregunta sobre ellos.",

    // Notifications
    "notif.fileSkipped.doc":
      "Omitiendo {file}: .doc (binario) no es compatible en el navegador. Convierta a .docx o .txt primero.",
    "notif.fileSkipped.ppt":
      "Omitiendo {file}: .ppt (binario) no es compatible en el navegador. Convierta a .pptx o .txt primero.",
    "notif.fileSkipped.other":
      "Omitiendo {file}: formato no compatible. Compatibles: {formats}",
    "notif.failedLlm": "Error al cargar LLM: {error}",

    // Help modal — Overview
    "help.title": "RAG-Browser &mdash; Acerca de",
    "help.overview.title": "Vista general",
    "help.overview.description":
      "Un agente de <strong>Generación Aumentada por Recuperación (RAG)</strong> completamente del lado del cliente en el navegador. Suba documentos (<code>.txt</code>, <code>.md</code>, <code>.csv</code>, <code>.xls</code>, <code>.xlsx</code>, <code>.docx</code>, <code>.pptx</code>, <code>.odt</code>, <code>.ods</code>, <code>.odp</code>, <code>.pdf</code>), cree embeddings localmente y consúltelos de forma conversacional &mdash; todo sin servidor, claves API o infraestructura cloud.",
    "help.overview.privacy":
      "<strong>Ningún dato de usuario abandona nunca su dispositivo.</strong> Toda la inferencia se ejecuta localmente en su navegador.",
    "help.architecture.title": "Arquitectura",
    "help.storage.title": "Almacenamiento y Caché de Modelos",
    "help.storage.whereTitle": "¿Dónde se almacena el modelo?",
    "help.storage.whereDesc":
      "Los modelos se almacenan en caché en el almacenamiento del navegador:",
    "help.storage.step1":
      "Abra las Herramientas de Desarrollo (<kbd>F12</kbd> o <kbd>Ctrl+Shift+I</kbd>)",
    "help.storage.step2": "Vaya a la pestaña <strong>Application</strong>",
    "help.storage.step3": "Expandir <strong>Storage &rarr; IndexedDB</strong>",
    "help.storage.step4":
      "Busque bases de datos que contengan <em>transformers</em> o <em>huggingface</em>",
    "help.storage.step5":
      "Los archivos del modelo se almacenan en <strong>Cache Storage</strong> bajo <em>transformers-cache</em>",
    "help.storage.deleteTitle": "¿Cómo eliminar la caché del modelo?",
    "help.storage.method1":
      "<strong>Método 1 &mdash; A través de las Herramientas de Desarrollo:</strong>",
    "help.storage.m1Step1":
      "Abra las Herramientas de Desarrollo (<kbd>F12</kbd>)",
    "help.storage.m1Step2": "Vaya a la pestaña <strong>Application</strong>",
    "help.storage.m1Step3":
      "Haga clic en <strong>Storage &rarr; Clear storage</strong>",
    "help.storage.m1Step4":
      "Marque <strong>Cache storage</strong> y <strong>IndexedDB</strong>",
    "help.storage.m1Step5": "Haga clic en <strong>Clear site data</strong>",
    "help.storage.method2":
      "<strong>Método 2 &mdash; A través de la configuración del navegador:</strong>",
    "help.storage.m2Step1":
      "Vaya a <strong>Ajustes &rarr; Privacidad y seguridad</strong>",
    "help.storage.m2Step2":
      "Haga clic en <strong>Borrar datos de navegación</strong>",
    "help.storage.m2Step3":
      "Seleccione <strong>Imágenes y archivos en caché</strong>",
    "help.storage.m2Step4": "Elija el rango de tiempo y borre",
    "help.storage.method3":
      "<strong>Método 3 &mdash; A través de la consola:</strong>",
    "help.storage.m3Step1":
      "Abra la <strong>Consola</strong> en las Herramientas de Desarrollo",
    "help.storage.m3Step2":
      "Ejecute: <code>caches.keys().then(keys => keys.forEach(k => caches.delete(k)))</code>",
    "help.webgpu.title": "Habilitar WebGPU",
    "help.webgpu.warning":
      "<strong>Importante:</strong> WebGPU mejora significativamente el rendimiento. Sin él, el modelo se ejecuta en la CPU, lo que puede ser <strong>10–50&times; más lento</strong>.",
    "help.webgpu.chromeTitle": "Google Chrome y Microsoft Edge (Chromium)",
    "help.webgpu.chromeDesc":
      "WebGPU está habilitado por defecto desde Chrome 113 y Edge 113. Si no está disponible:",
    "help.webgpu.chromeStep1":
      "Navegue a <code>chrome://flags</code> (o <code>edge://flags</code>)",
    "help.webgpu.chromeStep2": "Busque <strong>WebGPU</strong>",
    "help.webgpu.chromeStep3":
      "Establezca <strong>Unsafe WebGPU</strong> en <em>Habilitado</em>",
    "help.webgpu.chromeStep4": "Haga clic en <strong>Reiniciar</strong>",
    "help.webgpu.chromeCmd":
      "<strong>Alternativa de línea de comandos:</strong> <code>--enable-unsafe-webgpu</code>",
    "help.webgpu.firefoxTitle": "Mozilla Firefox",
    "help.webgpu.firefoxDesc":
      "WebGPU está habilitado por defecto desde Firefox 141+ (Windows) y 145+ (macOS). Para habilitar manualmente:",
    "help.webgpu.firefoxStep1":
      "Escriba <code>about:config</code> en la barra de direcciones y acepte la advertencia",
    "help.webgpu.firefoxStep2":
      "Busque <strong><code>dom.webgpu.enabled</code></strong>",
    "help.webgpu.firefoxStep3": "Cambié a <strong>true</strong>",
    "help.webgpu.firefoxStep4":
      "Opcionalmente establezca <strong><code>gfx.webgpu.ignore-blocklist</code></strong> en <strong>true</strong> si está bloqueado",
    "help.webgpu.safariTitle": "Safari",
    "help.webgpu.safariDesc":
      "WebGPU está habilitado por defecto desde Safari 26 (macOS Tahoe 26, iOS 26). Las versiones anteriores requieren Safari Technology Preview.",
    "help.webgpu.linuxTitle": "Linux (Chrome/Chromium)",
    "help.webgpu.linuxDesc": "Inicie con las siguientes banderas:",
    "help.webgpu.linuxExtra":
      "<em>Asegúrese de que sus controladores gráficos estén actualizados. También puede intentar <code>--ozone-platform=x11</code> en lugar de Wayland.</em>",
    "help.webgpu.tableTitle": "Resumen de Compatibilidad de Navegadores",
    "help.webgpu.tableBrowser": "Navegador",
    "help.webgpu.tableStatus": "Estado",
    "help.webgpu.tableEnable": "Cómo Habilitar",
    "help.webgpu.tips":
      "<strong>Consejos:</strong> Asegúrese de que la Aceleración por Hardware esté habilitada en la configuración del navegador. Mantenga sus controladores GPU actualizados para el mejor rendimiento.",
    "help.license.title": "Licencia",
    "help.license.desc":
      "Este proyecto se proporciona tal cual para uso personal e investigativo.",
    "help.license.thirdParty": "Modelos de Terceros",
    "help.license.thirdPartyDesc":
      "Esta aplicación incorpora los siguientes modelos, licenciados bajo Apache License 2.0:",
    "help.license.seeLicense":
      'Vea <a href="https://www.apache.org/licenses/LICENSE-2.0" target="_blank" rel="noopener">Apache License 2.0</a> para términos completos.',
  },

  // ─── French ─────────────────────────────────────────────────
  fr: {
    "status.hardware.detecting": "Détection du matériel...",
    "status.hardware.gpu": "WebGPU ({device})",
    "status.hardware.cpu": "WASM ({device})",
    "status.models.unloaded": "Modèles: non chargés",
    "status.models.embedding": "Modèles: embedding",
    "status.models.llm": "Modèles: LLM",
    "status.models.both": "Modèles: tous prêts",
    "status.models.summary": "Embedding: {emb} | LLM: {llm}",
    "status.index": "Index: {chunks} blocs, {docs} documents",
    "status.tokens": "Tokens: {input} entrée / {output} sortie",
    "status.tokens.idle": "Tokens: --",
    "status.tokens.active": "Tokens: {used} / {limit} ({remaining} restants)",
    "status.memory": "Mémoire: {used} / {limit} Mo",
    "status.memory.idle": "Mémoire: --",
    "status.token.warning.caution":
      "Utilisation du contexte proche de la limite ({percent}%). Pensez à vider le chat.",
    "status.token.warning.warning":
      "Contexte presque plein ({percent}%). Videz le chat pour continuer.",
    "status.token.warning.critical":
      "Contexte plein ({percent}%). Videz le chat immédiatement.",
    "status.token.warning.clearChat": "Vider le Chat",

    "modal.loading.title": "Chargement des Modèles",
    "modal.loading.description":
      "Téléchargement et initialisation des modèles d'IA...",
    "modal.loading.step.embedding": "Modèle d'Embedding (Qwen3-Embedding-0.6B)",
    "modal.loading.step.llm": "Modèle de Langage (Qwen3.5-2B)",
    "modal.loading.done": "fait",
    "modal.loading.ready": "prêt",
    "modal.loading.initializing": "initialisation",
    "modal.loading.overall": "Total: {percent}%",

    "sidebar.documents": "Documents",
    "sidebar.tooltip.embeddingRequired":
      "Chargez d'abord le modèle d'embedding pour activer le téléchargement de fichiers.",
    "sidebar.upload.files": "Télécharger des fichiers",
    "sidebar.btn.loadModels": "Charger les Modèles",
    "sidebar.btn.unloadEmbedding": "Décharger Modèle Embedding",
    "sidebar.btn.unloadLlm": "Décharger LLM",
    "sidebar.btn.clearChat": "Vider le Chat",

    "db.export": "Exporter la Base de Données",
    "db.import": "Importer la Base de Données",
    "db.clear": "Vider la Base de Données",

    "chat.placeholder": "Posez une question sur vos documents...",
    "chat.tooltip.queryDisabled":
      "Chargez d'abord les modèles pertinents pour activer les requêtes.",
    "chat.send": "Envoyer",
    "chat.stop": "Arrêter",

    "phase.embedding": "Incorporation de la requête...",
    "phase.searching": "Recherche de documents...",
    "phase.generating": "Génération de la réponse...",
    "phase.generating_composing": "Composition de la réponse...",
    "phase.generating_finalizing": "Finalisation de la réponse...",
    "phase.generating_thinking": "Réflexion...",
    "phase.generating_formulating": "Formulation de la réponse...",

    "notif.loadingEmbedding": "Chargement du modèle d'embedding...",
    "notif.failedEmbedding":
      "Échec du chargement du modèle d'embedding: {error}",
    "notif.failedLlm": "Échec du chargement du LLM: {error}",
    "notif.modelsLoaded": "Modèles chargés avec succès",
    "notif.generating": "Génération de la réponse...",
    "notif.stopped": "Réponse arrêtée par l'utilisateur",
    "notif.chatCleared": "Historique du chat vidé",
    "notif.dbExported": "Base de données exportée avec succès",
    "notif.dbImported":
      "Base de données importée avec succès ({count} blocs ajoutés)",
    "notif.dbCleared": "Base de données vidée",
    "notif.dbMergeConfirm":
      "Fusionner {imported} blocs du fichier dans les {existing} blocs existants ?",
    "notif.settingsReset": "Paramètres réinitialisés aux valeurs par défaut",
    "notif.llmSettingsReset": "Paramètres LLM réinitialisés aux préréglages",
    "notif.fileIndexed": "{file} indexé avec succès",
    "notif.fileIndexFailed": "Échec de l'indexation de {file}: {error}",
    "notif.noDocuments":
      "Téléchargez d'abord des documents pour que je puisse répondre.",
    "notif.queryFailed": "Échec de la requête: {error}",
    "notif.embeddingUnloaded": "Modèle d'embedding déchargé",
    "notif.reloadLlmFailed":
      "Échec du rechargement du LLM après le déchargement du modèle d'embedding",
    "notif.llmUnloaded": "LLM déchargé",
    "notif.reloadEmbeddingFailed":
      "Échec du rechargement du modèle d'embedding après le déchargement du LLM",
    "notif.dbClearedWithCount":
      "Base de données vidée ({count} blocs supprimés)",
    "notif.noDataExport":
      "Aucune donnée à exporter. Téléchargez et indexez des documents d'abord.",
    "notif.exported": "{count} blocs exportés vers {filename}",
    "notif.exportFailed": "Échec de l'export: {error}",
    "notif.invalidFileType":
      "Type de fichier invalide. Sélectionnez un fichier d'export .json.",
    "notif.importValidationFailed": "Échec de la validation d'import: {error}",
    "notif.importCancelled": "Import annulé.",
    "notif.imported": "{count} blocs importés depuis {file}",
    "notif.invalidJson": "Import échoué: le fichier n'est pas un JSON valide.",
    "notif.importFailed": "Import échoué: {error}",
    "notif.dbClearConfirm":
      "Ceci supprimera définitivement toutes les données indexées ({count} blocs).",
    "notif.cannotUndo": "Cette action est irréversible. Continuer ?",
    "notif.importReplaceConfirm":
      "Ceci va REMPLACER votre base de données actuelle ({current} blocs) par celle importée ({imported} blocs).\n\nContinuer ?",

    "settings.search.title": "Paramètres de Recherche",
    "settings.search.mode": "Mode de Recherche",
    "settings.search.mode.hybrid": "Hybride (Recommandé)",
    "settings.search.mode.vector": "Vectoriel uniquement",
    "settings.search.balance": "Équilibre Mot-clé vs Sémantique",
    "settings.search.bm25": "BM25: {value}%",
    "settings.search.vector": "Vectoriel: {value}%",
    "settings.similarityThresholds": "Seuils de Similarité",
    "settings.hybridScore": "Score Hybride",
    "settings.vectorGate": "Seuil Vectoriel",
    "settings.vectorSimilarity": "Similarité Vectorielle",
    "settings.maxResults": "Résultats Max (Top-N)",
    "settings.btn.resetDefaults": "Réinitialiser par Défaut",

    "settings.llm.title": "Paramètres LLM",
    "settings.llm.thinking": "Activer la Réflexion",
    "settings.llm.thinkingDesc":
      "Le modèle réfléchit avant de répondre. Utile pour les problèmes complexes mais plus lent et consomme plus de tokens.",
    "settings.llm.maxThinkingTokens": "Tokens Max de Réflexion",
    "settings.llm.maxThinkingTokensDesc":
      "Tokens maximum alloués au processus de raisonnement interne. Valeurs basses = plus rapide, valeurs hautes = analyse plus profonde.",
    "settings.llm.genParams": "Paramètres de Génération",
    "settings.llm.genParamsDesc":
      "Les valeurs s'ajustent automatiquement lors du changement de mode. Les modifications manuelles sont autorisées.",
    "settings.llm.temperature": "Température",
    "settings.llm.topP": "Top-p",
    "settings.llm.topK": "Top-k",
    "settings.llm.minP": "Min-p",
    "settings.llm.presencePenalty": "Pénalité de Présence",
    "settings.llm.repetitionPenalty": "Pénalité de Répétition",
    "settings.llm.maxNewTokens": "Tokens Max Nouveaux",
    "settings.llm.btn.resetPreset": "Réinitialiser Préréglage",

    "doc.chunks": "{count} blocs",

    "citation.similarity": "Similitude: {percent}%",
    "citation.chunk": "(bloc {index})",

    "status.modelState.ready": "prêt",
    "status.modelState.loading": "chargement",
    "status.modelState.unloaded": "non chargé",

    "tooltip.theme": "Changer de thème",
    "tooltip.help": "À propos de cette app",

    "lang.tooltip": "Sélectionner la langue",

    // App messages
    "app.restoredIndexedDb": "Récupéré depuis IndexedDB",

    // Chat placeholder
    "chat.empty":
      "Téléchargez des documents, puis posez une question à leur sujet.",

    // Notifications
    "notif.fileSkipped.doc":
      "Saut de {file} : .doc (binaire) non supporté dans le navigateur. Veuillez convertir en .docx ou .txt d'abord.",
    "notif.fileSkipped.ppt":
      "Saut de {file} : .ppt (binaire) non supporté dans le navigateur. Veuillez convertir en .pptx ou .txt d'abord.",
    "notif.fileSkipped.other":
      "Saut de {file} : format non supporté. Supportés : {formats}",
    "notif.failedLlm": "Échec du chargement du LLM : {error}",

    // Help modal — Overview
    "help.title": "RAG-Browser &mdash; À propos",
    "help.overview.title": "Aperçu",
    "help.overview.description":
      "Un agent <strong>Retrieval-Augmented Generation (RAG)</strong> entièrement côté client dans le navigateur. Téléchargez des documents (<code>.txt</code>, <code>.md</code>, <code>.csv</code>, <code>.xls</code>, <code>.xlsx</code>, <code>.docx</code>, <code>.pptx</code>, <code>.odt</code>, <code>.ods</code>, <code>.odp</code>, <code>.pdf</code>), créez des embeddings locaux et interrogez de manière conversationnelle &mdash; tout cela sans serveur, clés API ou infrastructure cloud.",
    "help.overview.privacy":
      "<strong>Aucune donnée utilisateur ne quitte jamais votre appareil.</strong> Toute l'inférence s'exécute localement dans votre navigateur.",
    "help.architecture.title": "Architecture",
    "help.storage.title": "Stockage et Cache des Modèles",
    "help.storage.whereTitle": "Où le modèle est-il stocké ?",
    "help.storage.whereDesc":
      "Les modèles sont mis en cache dans le stockage de votre navigateur :",
    "help.storage.step1":
      "Ouvrez les Outils de Développement (<kbd>F12</kbd> ou <kbd>Ctrl+Shift+I</kbd>)",
    "help.storage.step2": "Allez dans l'onglet <strong>Application</strong>",
    "help.storage.step3":
      "Développez <strong>Storage &rarr; IndexedDB</strong>",
    "help.storage.step4":
      "Recherchez des bases de données contenant <em>transformers</em> ou <em>huggingface</em>",
    "help.storage.step5":
      "Les fichiers du modèle sont stockés dans <strong>Cache Storage</strong> sous <em>transformers-cache</em>",
    "help.storage.deleteTitle": "Comment supprimer le cache du modèle ?",
    "help.storage.method1":
      "<strong>Méthode 1 &mdash; Via les Outils de Développement :</strong>",
    "help.storage.m1Step1":
      "Ouvrez les Outils de Développement (<kbd>F12</kbd>)",
    "help.storage.m1Step2": "Allez dans l'onglet <strong>Application</strong>",
    "help.storage.m1Step3":
      "Cliquez sur <strong>Storage &rarr; Clear storage</strong>",
    "help.storage.m1Step4":
      "Cochez <strong>Cache storage</strong> et <strong>IndexedDB</strong>",
    "help.storage.m1Step5": "Cliquez sur <strong>Clear site data</strong>",
    "help.storage.method2":
      "<strong>Méthode 2 &mdash; Via les paramètres du navigateur :</strong>",
    "help.storage.m2Step1":
      "Allez dans <strong>Paramètres &rarr; Vie privée et sécurité</strong>",
    "help.storage.m2Step2":
      "Cliquez sur <strong>Effacer les données de navigation</strong>",
    "help.storage.m2Step3":
      "Sélectionnez <strong>Images et fichiers en cache</strong>",
    "help.storage.m2Step4": "Choisissez l'intervalle de temps et effacez",
    "help.storage.method3":
      "<strong>Méthode 3 &mdash; Via la Console :</strong>",
    "help.storage.m3Step1":
      "Ouvrez la <strong>Console</strong> dans les Outils de Développement",
    "help.storage.m3Step2":
      "Exécutez : <code>caches.keys().then(keys => keys.forEach(k => caches.delete(k)))</code>",
    "help.webgpu.title": "Activer WebGPU",
    "help.webgpu.warning":
      "<strong>Important :</strong> WebGPU améliore considérablement les performances. Sans lui, le modèle s'exécute sur le CPU, ce qui peut être <strong>10–50&times; plus lent</strong>.",
    "help.webgpu.chromeTitle": "Google Chrome et Microsoft Edge (Chromium)",
    "help.webgpu.chromeDesc":
      "WebGPU est activé par défaut depuis Chrome 113 et Edge 113. S'il n'est pas disponible :",
    "help.webgpu.chromeStep1":
      "Rendez-vous sur <code>chrome://flags</code> (ou <code>edge://flags</code>)",
    "help.webgpu.chromeStep2": "Recherchez <strong>WebGPU</strong>",
    "help.webgpu.chromeStep3":
      "Réglez <strong>Unsafe WebGPU</strong> sur <em>Activé</em>",
    "help.webgpu.chromeStep4": "Cliquez sur <strong>Redémarrer</strong>",
    "help.webgpu.chromeCmd":
      "<strong>Alternative en ligne de commande :</strong> <code>--enable-unsafe-webgpu</code>",
    "help.webgpu.firefoxTitle": "Mozilla Firefox",
    "help.webgpu.firefoxDesc":
      "WebGPU est activé par défaut depuis Firefox 141+ (Windows) et 145+ (macOS). Pour activer manuellement :",
    "help.webgpu.firefoxStep1":
      "Tapez <code>about:config</code> dans la barre d'adresse et acceptez l'avertissement",
    "help.webgpu.firefoxStep2":
      "Recherchez <strong><code>dom.webgpu.enabled</code></strong>",
    "help.webgpu.firefoxStep3": "Réglez sur <strong>true</strong>",
    "help.webgpu.firefoxStep4":
      "Définissez éventuellement <strong><code>gfx.webgpu.ignore-blocklist</code></strong> sur <strong>true</strong> si bloqué",
    "help.webgpu.safariTitle": "Safari",
    "help.webgpu.safariDesc":
      "WebGPU est activé par défaut depuis Safari 26 (macOS Tahoe 26, iOS 26). Les versions antérieures nécessitent Safari Technology Preview.",
    "help.webgpu.linuxTitle": "Linux (Chrome/Chromium)",
    "help.webgpu.linuxDesc": "Lancez avec les drapeaux suivants :",
    "help.webgpu.linuxExtra":
      "<em>Assurez-vous que vos pilotes graphiques sont à jour. Vous pouvez également essayer <code>--ozone-platform=x11</code> au lieu de Wayland.</em>",
    "help.webgpu.tableTitle":
      "Résumé de la prise en charge par les navigateurs",
    "help.webgpu.tableBrowser": "Navigateur",
    "help.webgpu.tableStatus": "Statut",
    "help.webgpu.tableEnable": "Comment Activer",
    "help.webgpu.tips":
      "<strong>Conseils :</strong> Assurez-vous que l'Accélération Matérielle est activée dans les paramètres du navigateur. Gardez vos pilotes GPU à jour pour de meilleures performances.",
    "help.license.title": "Licence",
    "help.license.desc":
      "Ce projet est fourni en l'état pour un usage personnel et de recherche.",
    "help.license.thirdParty": "Modèles Tiers",
    "help.license.thirdPartyDesc":
      "Cette application incorpore les modèles suivants, sous licence Apache License 2.0 :",
    "help.license.seeLicense":
      'Voir <a href="https://www.apache.org/licenses/LICENSE-2.0" target="_blank" rel="noopener">Apache License 2.0</a> pour les conditions complètes.',
  },
};

let currentLang = FALLBACK_LANG;

/**
 * Detect the best matching language from the browser's language preference.
 * @returns {string} Language code
 */
function detectBrowserLanguage() {
  const browserLang = (
    navigator.languages?.[0] ||
    navigator.language ||
    navigator.userLanguage ||
    FALLBACK_LANG
  ).toLowerCase();

  // Exact match
  if (SUPPORTED_LANGUAGES[browserLang]) return browserLang;

  // Prefix match (e.g., "de-CH" → "de")
  const prefix = browserLang.split("-")[0];
  if (SUPPORTED_LANGUAGES[prefix]) return prefix;

  return FALLBACK_LANG;
}

/**
 * Initialize i18n. Called once on app startup.
 * Restores persisted language or auto-detects from browser.
 * Applies translations to all elements with data-i18n attributes.
 */
export function initI18n() {
  const saved = localStorage.getItem("lang");
  if (saved && SUPPORTED_LANGUAGES[saved]) {
    currentLang = saved;
  } else {
    currentLang = detectBrowserLanguage();
  }

  // Update HTML lang attribute
  document.documentElement.lang = currentLang;

  // Apply initial translations to static elements
  applyStaticTranslations();
}

/**
 * Get the current language code.
 * @returns {string}
 */
export function getLanguage() {
  return currentLang;
}

/**
 * Change the active language. Persists to localStorage.
 * @param {string} lang - Language code (en, de, it, es, fr)
 */
export function setLanguage(lang) {
  if (!SUPPORTED_LANGUAGES[lang]) {
    console.warn(`Unsupported language: ${lang}`);
    return;
  }
  currentLang = lang;
  localStorage.setItem("lang", lang);
  document.documentElement.lang = lang;
  applyStaticTranslations();
}

/**
 * Translate a key with optional interpolation.
 * Falls back to English, then returns the key itself.
 *
 * @param {string} key - Translation key (dot-notation)
 * @param {Object} [params] - Interpolation parameters ({ placeholder: value })
 * @returns {string} Translated string
 */
export function t(key, params = {}) {
  let str = translations[currentLang]?.[key] ?? translations.en[key] ?? key;

  // Interpolate {placeholder} patterns
  return str.replace(/\{(\w+)\}/g, (_, p) => params[p] ?? `{${p}}`);
}

/**
 * Apply translations to all elements with data-i18n attributes.
 * Handles:
 *   - data-i18n="key" → textContent
 *   - data-i18n-placeholder="key" → placeholder attribute
 *   - data-i18n-tooltip="key" → data-tooltip attribute
 *   - data-i18n-params='{"count":5}' → interpolation params (JSON)
 */
function applyStaticTranslations() {
  // Translate textContent
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    const paramsAttr = el.getAttribute("data-i18n-params");
    const params = paramsAttr ? JSON.parse(paramsAttr) : {};
    el.textContent = t(key, params);
  });

  // Translate placeholders
  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    const key = el.getAttribute("data-i18n-placeholder");
    el.placeholder = t(key);
  });

  // Translate tooltips
  document.querySelectorAll("[data-i18n-tooltip]").forEach((el) => {
    const key = el.getAttribute("data-i18n-tooltip");
    el.setAttribute("data-tooltip", t(key));
  });

  // Translate <option> elements
  document.querySelectorAll("[data-i18n-option]").forEach((el) => {
    const key = el.getAttribute("data-i18n-option");
    el.textContent = t(key);
  });

  // Translate innerHTML (for elements with nested markup like <strong>, <code>)
  document.querySelectorAll("[data-i18n-html]").forEach((el) => {
    const key = el.getAttribute("data-i18n-html");
    el.innerHTML = t(key);
  });

  // Update language selector button label
  const langBtn = document.getElementById("lang-selector-btn");
  if (langBtn) {
    langBtn.textContent = SUPPORTED_LANGUAGES[currentLang]?.nativeLabel ?? "EN";
  }
}

/**
 * Get all supported languages.
 * @returns {Object}
 */
export function getSupportedLanguages() {
  return SUPPORTED_LANGUAGES;
}
