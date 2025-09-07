#!/usr/bin/env bun

/**
 * Simple test script to verify cache logging functionality
 * Run with: bun run test-cache-logging.ts
 */

import {
  cacheEmbedding,
  cacheRagResults,
  getCachedEmbedding,
  getCachedRagResults,
} from './src/domains/rag/services/rag-cache-service';
import {
  generateRequestId,
  performanceLogger,
} from './src/lib/performance-logger';

async function testCacheLogging() {
  const requestId = generateRequestId();

  // Start performance session
  performanceLogger.startSession(requestId);

  try {
    const testText = 'What is the climate policy?';
    const mockEmbedding = Array.from({ length: 1536 }, () => Math.random());

    // First call - should be a cache miss and write
    const _cachedEmbedding1 = await getCachedEmbedding(testText, requestId);

    // Cache the embedding
    await cacheEmbedding(testText, mockEmbedding, requestId);

    // Second call - should be a cache hit
    const _cachedEmbedding2 = await getCachedEmbedding(testText, requestId);
    const mockResults = [
      { content: 'Climate policy result 1', similarity: 0.85 },
      { content: 'Climate policy result 2', similarity: 0.82 },
    ];

    // First call - should be a cache miss and write
    const _cachedResults1 = await getCachedRagResults({
      query: testText,
      partyShortName: 'AP',
      limit: 8,
      minSimilarity: 0.6,
      requestId,
    });

    // Cache the results
    await cacheRagResults({
      query: testText,
      partyShortName: 'AP',
      limit: 8,
      minSimilarity: 0.6,
      results: mockResults,
      requestId,
    });

    // Second call - should be a cache hit
    const _cachedResults2 = await getCachedRagResults({
      query: testText,
      partyShortName: 'AP',
      limit: 8,
      minSimilarity: 0.6,
      requestId,
    });
  } catch (_error) {
  } finally {
    // End performance session
    performanceLogger.endSession(requestId);
  }
}

// Run the test
testCacheLogging();
