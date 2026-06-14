// rag-pipeline.js — RAG pipeline orchestration (ingestion + retrieval & generation)

import { chunkText } from "./chunker.js";
import { embedQuery, embedDocuments, getEmbeddingArrays } from "./embedding.js";
import { parseFile, needsOfficeParser } from "./fileParser.js";
import { generateResponse } from "./llm.js";
import { insertChunks, searchHybrid, searchVector } from "./orama-db.js";
import { getRecentHistory, getState } from "./state.js";

// ─── Ingestion Pipeline ───────────────────────────────────────────────

/**
 * Ingest a supported document: parse, chunk, embed, and index in Orama.
 * Supports: .txt, .md, .csv, .xls, .xlsx, .docx, .pptx, .odt, .ods, .odp
 *
 * @param {File} file - The uploaded file
 * @param {Object} db - Orama database instance
 * @param {Function} progressCallback - Called with { step, progress, message } at each stage
 * @returns {Promise<{ chunks: number, fileSize: number }>}
 */
export async function ingestDocument(file, db, progressCallback) {
  // Step 1: Read/parse file
  progressCallback({
    step: "reading",
    progress: 0,
    message: `Reading ${file.name}...`,
  });
  const fileSize = file.size;

  // For office files (docx, xlsx, etc.), load parser first
  if (needsOfficeParser(file.name)) {
    progressCallback({
      step: "loading-parser",
      progress: 5,
      message: `Loading parser for ${file.name}...`,
    });
  }

  const text = await parseFile(file);

  // Step 2: Chunk text
  progressCallback({
    step: "chunking",
    progress: 25,
    message: "Chunking document...",
  });
  const chunks = chunkText(text, { sourceFile: file.name });

  // Step 3: Generate embeddings (in batches)
  progressCallback({
    step: "embedding",
    progress: 50,
    message: `Generating embeddings for ${chunks.length} chunks...`,
  });
  const batchSize = 32;
  const allEmbeddings = [];

  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize).map((c) => c.content);
    const flatData = await embedDocuments(batch);
    const embeddingArrays = getEmbeddingArrays(flatData, batch.length);
    allEmbeddings.push(...embeddingArrays);

    const embedProgress =
      50 + (Math.min(i + batchSize, chunks.length) / chunks.length) * 40;
    progressCallback({
      step: "embedding",
      progress: embedProgress,
      message: `Embedded ${Math.min(i + batchSize, chunks.length)}/${chunks.length} chunks...`,
    });
  }

  // Step 4: Insert into Orama
  progressCallback({
    step: "indexing",
    progress: 95,
    message: "Indexing chunks...",
  });
  const documents = chunks.map((chunk, i) => ({
    ...chunk,
    embedding: allEmbeddings[i],
  }));

  await insertChunks(db, documents);

  progressCallback({
    step: "complete",
    progress: 100,
    message: `Indexed ${chunks.length} chunks from ${file.name}`,
  });

  return { chunks: chunks.length, fileSize };
}

// ─── Retrieval & Generation Pipeline ──────────────────────────────────

/**
 * System prompt template for RAG generation.
 * Context and question are injected at runtime.
 */
const SYSTEM_PROMPT = `You are a helpful assistant. Answer the user's question using ONLY the provided context. If the context does not contain enough information, say so clearly. Cite your sources by referencing the document chunks.

Context:
{context}

Question: {question}`;

/**
 * Maximum number of conversation history messages to include (10 = 5 exchanges).
 */
const MAX_HISTORY = 10;

/**
 * Retrieve relevant chunks and generate a streaming response.
 *
 * @param {string} query - User's question
 * @param {Object} db - Orama database instance
 * @param {Function} onToken - Streaming callback receiving accumulated text
 * @param {Function} onComplete - Completion callback receiving final text
 * @returns {Promise<{ sourceChunks: Array, similarity: Array }>}
 */
export async function retrieveAndGenerate(query, db, onToken, onComplete) {
  // Step 1: Embed query (with instruction wrapper)
  const queryEmbedding = await embedQuery(query);

  // Step 2: Get current search configuration from state
  const searchConfig = getState().searchConfig;

  let results;
  if (searchConfig.mode === "hybrid") {
    // Hybrid search — combines BM25 keyword matching with vector similarity.
    results = await searchHybrid(db, query, queryEmbedding, {
      similarity: searchConfig.thresholds.hybridSimilarity,
      minVectorSimilarity: searchConfig.thresholds.minVectorSimilarity,
      limit: searchConfig.topN,
      hybridWeights: searchConfig.hybridWeights,
    });
  } else {
    // Pure vector search
    results = await searchVector(db, queryEmbedding, {
      similarity: searchConfig.thresholds.vectorSimilarity,
      limit: searchConfig.topN,
    });
  }

  // Debug logging for retrieval diagnostics
  console.groupCollapsed(
    `🔍 Retrieval [${searchConfig.mode}]: "${query.slice(0, 60)}${query.length > 60 ? "..." : ""}"`,
  );
  console.log(`Hits: ${results.hits?.length ?? 0}`);
  console.log(
    `Config: threshold=${searchConfig.thresholds[searchConfig.mode === "hybrid" ? "hybridSimilarity" : "vectorSimilarity"]}, topN=${searchConfig.topN}`,
  );
  if (results.hits) {
    results.hits.forEach((hit, i) => {
      console.log(
        `  [${i + 1}] score=${hit.score.toFixed(3)} | ${hit.document.content.slice(0, 80)}...`,
      );
    });
  }
  console.groupEnd();

  // Step 3: Build context string from retrieved chunks (or empty if no relevant results)
  const contextChunks = results.hits
    ? results.hits
        .map(
          (hit, i) =>
            `[Source ${i + 1}: ${hit.document.metadata.sourceFile} (chunk ${hit.document.metadata.chunkIndex})]\n${hit.document.content}`,
        )
        .join("\n\n---\n\n")
    : "";

  // Step 4: Build system prompt with context and question
  const systemPrompt = SYSTEM_PROMPT.replace(
    "{context}",
    contextChunks || "(no relevant context found)",
  ).replace("{question}", query);

  // Step 5: Build conversation messages with history
  const recentHistory = getRecentHistory(MAX_HISTORY);
  const messages = [
    { role: "system", content: [{ type: "text", text: systemPrompt }] },
    ...recentHistory,
    { role: "user", content: [{ type: "text", text: query }] },
  ];

  // Step 6: Generate response via LLM
  await generateResponse(messages, onToken, (fullText) => {
    if (onComplete) {
      onComplete(fullText, {
        sourceChunks: results.hits?.map((hit) => hit.document) ?? [],
        similarity: results.hits?.map((hit) => hit.score) ?? [],
      });
    }
  });

  return {
    sourceChunks: results.hits?.map((hit) => hit.document) ?? [],
    similarity: results.hits?.map((hit) => hit.score) ?? [],
  };
}
