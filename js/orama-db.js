// orama-db.js — Orama database operations with IndexedDB persistence

import { create, insertMultiple, search } from 'https://cdn.jsdelivr.net/npm/@orama/orama@3.1.18/+esm';

// IndexedDB constants
const DB_NAME = 'rag-browser-db';
const DB_VERSION = 1;
const STORE_NAME = 'documents';

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
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
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
    const blob = new Blob([data], { type: 'application/json' });

    const idb = await openDB();
    const tx = idb.transaction([STORE_NAME], 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.clear();
    store.put({ id: 'orama-db', data: blob });
    store.put({
      id: 'metadata',
      timestamp: Date.now(),
      version: DB_VERSION,
    });

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (error) {
    if (error.name === 'QuotaExceededError') {
      console.warn('IndexedDB quota exceeded. Consider reducing document count.');
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
    const tx = idb.transaction([STORE_NAME], 'readonly');
    const store = tx.objectStore(STORE_NAME);

    const req = store.get('orama-db');
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
