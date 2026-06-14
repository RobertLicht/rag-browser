// orama-db.js — Orama database operations with IndexedDB persistence

import {
  create,
  insertMultiple,
  search,
} from "https://cdn.jsdelivr.net/npm/@orama/orama@3.1.18/+esm";

// IndexedDB constants
const DB_NAME = "rag-browser-db";
const DB_VERSION = 1;
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
  return db.count;
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
 * Serializes the full Orama DB as JSON and stores it alongside metadata.
 *
 * @param {Object} db - Orama database instance
 */
export async function persistIndex(db) {
  try {
    const data = JSON.stringify(db);
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
 * @returns {Promise<Object|null>} The deserialized Orama database, or null if not found
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
          resolve(JSON.parse(text));
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

// ─── Export / Import helpers ────────────────────────────────────────

const EXPORT_FORMAT = "rag-browser-orama";
const EXPORT_VERSION = 1;
const EXPECTED_DIMENSION = 1024;

/**
 * Serialize the Orama database into a versioned JSON envelope suitable for
 * file export. The envelope adds metadata so import-side validation can verify
 * compatibility before accepting the data.
 *
 * @param {Object} db - Orama database instance
 * @returns {Blob} JSON blob ready for download
 */
export function serializeDB(db) {
  const envelope = {
    format: EXPORT_FORMAT,
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    embeddingDimension: EXPECTED_DIMENSION,
    documentCount: db.count,
    database: db,
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
 * Validate an imported database file. Accepts both the versioned envelope
 * format and raw Orama JSON objects (backward compatibility).
 *
 * @param {Object} data - Parsed JSON from the uploaded file
 * @returns {{ valid: boolean, database?: Object, metadata?: Object, error?: string }}
 */
export function validateImport(data) {
  // Allow null/empty
  if (!data || typeof data !== "object") {
    return { valid: false, error: "File does not contain valid JSON." };
  }

  let database = null;
  let metadata = {};

  // Detect format: envelope or raw Orama object
  if (data.format === EXPORT_FORMAT && data.database) {
    // Versioned envelope
    database = data.database;
    metadata = {
      format: data.format,
      version: data.version,
      exportedAt: data.exportedAt,
      embeddingDimension: data.embeddingDimension,
      documentCount: data.documentCount,
    };
  } else if (data.schema && data.docs) {
    // Raw Orama object (backward compatibility)
    database = data;
    metadata = { format: "raw-orama" };
  } else {
    return {
      valid: false,
      error:
        "File is not a valid RAG-Browser database export. Expected a JSON file with 'format' and 'database' keys, or a raw Orama database.",
    };
  }

  // Validate schema structure
  const schema = database.schema;
  if (!schema || typeof schema !== "object") {
    return { valid: false, error: "Database is missing a valid schema." };
  }

  if (schema.content !== "string") {
    return {
      valid: false,
      error: 'Schema mismatch: expected content field of type "string".',
    };
  }

  // Validate embedding dimension
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

  // Validate metadata sub-schema
  const metaSchema = schema.metadata;
  if (!metaSchema || typeof metaSchema !== "object") {
    return {
      valid: false,
      error: 'Schema mismatch: expected a "metadata" nested field.',
    };
  }

  return { valid: true, database, metadata };
}
