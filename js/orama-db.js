// orama-db.js — Orama database operations with IndexedDB persistence

import {
  count,
  create,
  insertMultiple,
  search,
  save,
  load,
} from "https://cdn.jsdelivr.net/npm/@orama/orama@3.1.18/+esm";

// IndexedDB constants
const DB_NAME = "rag-browser-db";
const DB_VERSION = 2;
const STORE_NAME = "documents";

/**
 * Create a new Orama database with the document schema.
 *
 * Schema fields:
 * - content: string (the text chunk)
 * - embedding: vector[1024] (the embedding vector for similarity search)
 * - metadata.sourceFile: string (origin filename)
 * - metadata.chunkIndex: number (sequential index within the file)
 * - metadata.charOffset: number (character offset in original text)
 * - metadata.charLength: number (length of this chunk in characters)
 */
export function createDB() {
  return create({
    schema: {
      content: "string",
      embedding: "vector[1024]",
      metadata: {
        sourceFile: "string",
        chunkIndex: "number",
        charOffset: "number",
        charLength: "number",
      },
    },
  });
}

/**
 * Bulk-insert document chunks into the Orama database.
 * @param {Object} db - Orama database instance
 * @param {Array} chunks - Array of { content, embedding, metadata } objects
 */
export async function insertChunks(db, chunks) {
  await insertMultiple(db, chunks);
}

/**
 * Perform vector similarity search on the Orama database.
 *
 * @param {Object} db - Orama database instance
 * @param {number[]} queryEmbedding - 1024-dimensional query vector
 * @param {Object} options - Search options
 * @param {number} options.similarity - Minimum cosine similarity (default 0.7)
 * @param {number} options.limit - Max results to return (default 5)
 * @returns {Object} Search results with hits array
 */
export async function searchVector(db, queryEmbedding, options = {}) {
  return search(db, {
    mode: "vector",
    vector: {
      value: queryEmbedding,
      property: "embedding",
    },
    similarity: options.similarity ?? 0.7,
    limit: options.limit ?? 5,
    includeVectors: false,
  });
}

/**
 * Perform hybrid search (BM25 keyword + vector similarity) on the Orama database.
 *
 * Hybrid search combines lexical keyword matching with semantic vector similarity,
 * producing significantly more precise results than pure vector search alone.
 * This prevents irrelevant chunks from being retrieved when vector similarity
 * scores are ambiguous (e.g., short documents with few chunks).
 *
 * @param {Object} db - Orama database instance
 * @param {string} queryText - The original user query for keyword matching
 * @param {number[]} queryEmbedding - 1024-dimensional query vector
 * @param {Object} options - Search options
 * @param {number} options.similarity - Minimum combined similarity (default 0.75)
 * @param {number} options.minVectorSimilarity - Minimum vector similarity gate (default 0.65)
 * @param {number} options.limit - Max results to return (default 5)
 * @param {Object} options.hybridWeights - BM25 vs vector weight balance
 * @returns {Object} Search results with hits array
 */
export async function searchHybrid(
  db,
  queryText,
  queryEmbedding,
  options = {},
) {
  const results = search(db, {
    mode: "hybrid",
    term: queryText,
    vector: {
      value: queryEmbedding,
      property: "embedding",
    },
    similarity: options.similarity ?? 0.75,
    limit: options.limit ?? 5,
    includeVectors: false,
    // Weight BM25 keyword matching higher for precision
    hybridWeights: options.hybridWeights ?? {
      text: 0.7,
      vector: 0.3,
    },
  });

  // Quality gate: filter out results with vector similarity below threshold.
  // Hybrid scoring can promote keyword-only matches with low semantic relevance.
  // The minVectorSimilarity gate ensures semantic relevance is maintained.
  const minVectorSim = options.minVectorSimilarity ?? 0.65;
  if (results.hits) {
    results.hits = results.hits.filter((hit) => hit.score >= minVectorSim);
  }

  return results;
}

/**
 * Get the total number of documents in the Orama database.
 */
export function getDocumentCount(db) {
  return count(db);
}

/**
 * Open an IndexedDB connection with proper upgrade handling.
 * @returns {Promise<IDBDatabase>} Resolved database connection
 */
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Persist the Orama database to IndexedDB.
 * Uses Orama's save() to produce proper serializable state, then stores it
 * as a JSON blob alongside metadata.
 *
 * @param {Object} db - Orama database instance
 */
export async function persistIndex(db) {
  try {
    const rawData = save(db);
    const data = JSON.stringify(rawData);
    const blob = new Blob([data], { type: "application/json" });

    const idb = await openDB();
    const tx = idb.transaction([STORE_NAME], "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.clear();
    store.put({ id: "orama-db", data: blob });
    store.put({
      id: "metadata",
      timestamp: Date.now(),
      version: DB_VERSION,
    });

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (error) {
    if (error.name === "QuotaExceededError") {
      console.warn(
        "IndexedDB quota exceeded. Consider reducing document count.",
      );
    }
    throw error;
  }
}

/**
 * Restore the Orama database from IndexedDB.
 *
 * Detects whether the stored data is in old format (raw JSON of DB object)
 * or new format (output of save()) and uses the appropriate restoration
 * method. This preserves backward compatibility with previously persisted
 * data after the version bump.
 *
 * @returns {Promise<Object>} The restored Orama database with all methods
 */
export async function restoreIndex() {
  try {
    const idb = await openDB();
    const tx = idb.transaction([STORE_NAME], "readonly");
    const store = tx.objectStore(STORE_NAME);

    const req = store.get("orama-db");
    return new Promise((resolve) => {
      req.onsuccess = async () => {
        if (req.result && req.result.data) {
          const text = await req.result.data.text();
          const storedData = JSON.parse(text);

          // Detect format and restore appropriately
          if (storedData.schema) {
            // Old format: raw DB object — extract docs and re-insert
            const db = createDB();
            let docs = storedData.docs;
            if (docs && typeof docs === "object" && !Array.isArray(docs)) {
              docs = docs.docs ? Object.values(docs.docs) : Object.values(docs);
            }
            if (Array.isArray(docs) && docs.length > 0) {
              await insertMultiple(db, docs);
            }
            resolve(db);
          } else {
            // New format from save(): use load() for instant restoration
            const db = createDB();
            await load(db, storedData);
            resolve(db);
          }
        } else {
          resolve(createDB());
        }
      };
      req.onerror = () => resolve(createDB());
    });
  } catch {
    return createDB();
  }
}

// ─── Default database ──────────────────────────────────────────────

/**
 * Path to the bundled default database. Loaded on first run so the user
 * has an initial starting point without uploading files manually.
 */
const DEFAULT_DB_PATH = "examples/rag-browser-db-20260624-023133-1chunks.json";

/**
 * Load the default database from the server.
 * Returns a fully functional Orama database, or `null` if loading fails
 * (e.g., offline, file not found, validation error).
 */
export async function loadDefaultDatabase() {
  try {
    const response = await fetch(DEFAULT_DB_PATH);
    if (!response.ok) {
      console.warn(
        `Default database fetch failed (${response.status}), skipping.`,
      );
      return null;
    }

    const parsed = await response.json();
    const result = validateImport(parsed);
    if (!result.valid) {
      console.warn("Default database validation failed:", result.error);
      return null;
    }

    return await restoreFromData(result.rawData);
  } catch (error) {
    console.warn("Failed to load default database:", error.message);
    return null;
  }
}

// ─── Export / Import helpers ────────────────────────────────────────

const EXPORT_FORMAT = "rag-browser-orama";
const EXPORT_VERSION = 2;
const EXPECTED_DIMENSION = 1024;

/**
 * Serialize the Orama database into a versioned JSON envelope suitable for
 * file export. Uses Orama's save() to produce proper serializable state,
 * ensuring all internal structures (indices, vectors) are captured faithfully.
 *
 * @param {Object} db - Orama database instance
 * @returns {Blob} JSON blob ready for download
 */
export function serializeDB(db) {
  const rawData = save(db);

  const envelope = {
    format: EXPORT_FORMAT,
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    embeddingDimension: EXPECTED_DIMENSION,
    documentCount: count(db),
    rawData: rawData,
  };

  return new Blob([JSON.stringify(envelope)], {
    type: "application/json",
  });
}

/**
 * Generate a human-friendly filename for an exported database.
 * Pattern: rag-browser-db-YYYYMMDD-HHmmss-Nchunks.json
 *
 * @param {number} documentCount - Number of chunks in the database
 * @returns {string}
 */
export function generateExportFilename(documentCount) {
  const now = new Date();
  const pad = (n, w = 2) => String(n).padStart(w, "0");
  const ts = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  return `rag-browser-db-${ts}-${documentCount}chunks.json`;
}

/**
 * Restore an Orama database from serialized raw data.
 *
 * Detects the data format and uses the appropriate restoration method:
 * - New format (from save()): has searchablePropertiesWithTypes → use load()
 * - Old format (raw DB object): has schema + docs → extract and re-insert
 *
 * @param {Object} rawData - The raw serialized state from save() or an old-style database object
 * @returns {Promise<Object>} A fully functional Orama database instance
 */
export async function restoreFromData(rawData) {
  const db = createDB();

  if (rawData.index?.searchablePropertiesWithTypes) {
    // New format: produced by save() — load restores the full internal state
    await load(db, rawData);
  } else if (rawData.docs && typeof rawData.docs === "object") {
    // Old format (raw DB object or version 1 export): extract documents and re-insert.
    // Docs may be an array or an object keyed by internal ID (e.g. {"1": {...}, "2": {...}}).
    let docs = rawData.docs;
    if (!Array.isArray(docs) && docs.docs) {
      // Nested docs structure: { docs: { ... }, count: N }
      docs = docs.docs;
    }
    const docArray = Array.isArray(docs) ? docs : Object.values(docs);
    if (docArray.length > 0) {
      await insertMultiple(db, docArray);
    }
  }

  return db;
}

/**
 * Validate an imported database file. Accepts both the new versioned envelope
 * format (with rawData) and old formats for backward compatibility:
 * - Version 2: envelope with 'rawData' key (save() output, no top-level schema)
 * - Version 1: envelope with 'database' key (raw Orama object with schema)
 * - Raw Orama object: direct schema/docs structure
 *
 * @param {Object} data - Parsed JSON from the uploaded file
 * @returns {{ valid: boolean, rawData?: Object, metadata?: Object, error?: string }}
 */
export function validateImport(data) {
  if (!data || typeof data !== "object") {
    return { valid: false, error: "File does not contain valid JSON." };
  }

  let rawData = null;
  let metadata = {};

  // Detect format and extract raw database data
  if (data.format === EXPORT_FORMAT && data.rawData) {
    // Version 2: proper serialized state from save()
    rawData = data.rawData;
    metadata = {
      format: data.format,
      version: data.version,
      exportedAt: data.exportedAt,
      embeddingDimension: data.embeddingDimension,
      documentCount: data.documentCount,
    };
  } else if (data.format === EXPORT_FORMAT && data.database) {
    // Version 1: raw Orama object (backward compatibility)
    rawData = data.database;
    metadata = {
      format: data.format,
      version: data.version,
      exportedAt: data.exportedAt,
      embeddingDimension: data.embeddingDimension,
      documentCount: data.documentCount,
    };
  } else if (data.schema && data.docs) {
    // Raw Orama object (backward compatibility)
    rawData = data;
    metadata = { format: "raw-orama" };
  } else {
    return {
      valid: false,
      error:
        "File is not a valid RAG-Browser database export. Expected a JSON file with 'format' and 'rawData' keys, or a raw Orama database.",
    };
  }

  // Validate structure based on format type.
  // save() output nests searchablePropertiesWithTypes under index.
  // Raw DB objects use a nested schema object.
  if (rawData.index?.searchablePropertiesWithTypes) {
    const types = rawData.index.searchablePropertiesWithTypes;

    if (types.content !== "string") {
      return {
        valid: false,
        error: 'Schema mismatch: expected content field of type "string".',
      };
    }

    const embType = types.embedding;
    const dimMatch = String(embType).match(/^vector\[(\d+)\]$/);
    if (!dimMatch) {
      return {
        valid: false,
        error:
          'Schema mismatch: expected an embedding field like "vector[1024]".',
      };
    }

    const actualDim = parseInt(dimMatch[1], 10);
    if (actualDim !== EXPECTED_DIMENSION) {
      return {
        valid: false,
        error: `Embedding dimension mismatch. Expected ${EXPECTED_DIMENSION}, got ${actualDim}. This database was likely created with a different embedding model.`,
      };
    }

    if (!types["metadata.sourceFile"] || !types["metadata.chunkIndex"]) {
      return {
        valid: false,
        error: 'Schema mismatch: expected "metadata" nested fields.',
      };
    }
  } else if (rawData.schema && typeof rawData.schema === "object") {
    // Old-format or raw Orama object validation
    const schema = rawData.schema;

    if (schema.content !== "string") {
      return {
        valid: false,
        error: 'Schema mismatch: expected content field of type "string".',
      };
    }

    const embType = schema.embedding;
    const dimMatch = String(embType).match(/^vector\[(\d+)\]$/);
    if (!dimMatch) {
      return {
        valid: false,
        error:
          'Schema mismatch: expected an embedding field like "vector[1024]".',
      };
    }

    const actualDim = parseInt(dimMatch[1], 10);
    if (actualDim !== EXPECTED_DIMENSION) {
      return {
        valid: false,
        error: `Embedding dimension mismatch. Expected ${EXPECTED_DIMENSION}, got ${actualDim}. This database was likely created with a different embedding model.`,
      };
    }

    const metaSchema = schema.metadata;
    if (!metaSchema || typeof metaSchema !== "object") {
      return {
        valid: false,
        error: 'Schema mismatch: expected a "metadata" nested field.',
      };
    }
  } else {
    return {
      valid: false,
      error:
        "Database is missing a recognizable structure. Expected either 'searchablePropertiesWithTypes' (new format) or 'schema' (old format).",
    };
  }

  return { valid: true, rawData, metadata };
}
