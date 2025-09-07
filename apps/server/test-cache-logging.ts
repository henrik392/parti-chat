#!/usr/bin/env bun
/**
 * Simple test script to verify cache logging functionality
 * Run with: bun run test-cache-logging.ts
 */

import { generateRequestId, performanceLogger } from './src/lib/performance-logger';
import {
  cacheEmbedding,
  cacheRagResults,
  getCachedEmbedding,
  getCachedRagResults,
} from './src/domains/rag/services/rag-cache-service';

async function testCacheLogging() {
  const requestId = generateRequestId();
  console.log(`🧪 Testing cache logging with request ID: ${requestId}`);

  // Start performance session
  performanceLogger.startSession(requestId);

  try {
    // Test embedding cache
    console.log('\n📊 Testing embedding cache...');
    const testText = 'What is the climate policy?';
    const mockEmbedding = Array.from({ length: 1536 }, () => Math.random());

    // First call - should be a cache miss and write
    const cachedEmbedding1 = await getCachedEmbedding(testText, requestId);
    console.log('First embedding lookup (should be miss):', cachedEmbedding1 ? 'HIT' : 'MISS');

    // Cache the embedding
    await cacheEmbedding(testText, mockEmbedding, requestId);
    console.log('✅ Embedding cached successfully');

    // Second call - should be a cache hit
    const cachedEmbedding2 = await getCachedEmbedding(testText, requestId);
    console.log('Second embedding lookup (should be hit):', cachedEmbedding2 ? 'HIT' : 'MISS');

    // Test RAG cache
    console.log('\n🔍 Testing RAG search cache...');
    const mockResults = [
      { content: 'Climate policy result 1', similarity: 0.85 },
      { content: 'Climate policy result 2', similarity: 0.82 },
    ];

    // First call - should be a cache miss and write
    const cachedResults1 = await getCachedRagResults({
      query: testText,
      partyShortName: 'AP',
      limit: 8,
      minSimilarity: 0.6,
      requestId,
    });
    console.log('First RAG lookup (should be miss):', cachedResults1 ? 'HIT' : 'MISS');

    // Cache the results
    await cacheRagResults({
      query: testText,
      partyShortName: 'AP',
      limit: 8,
      minSimilarity: 0.6,
      results: mockResults,
      requestId,
    });
    console.log('✅ RAG results cached successfully');

    // Second call - should be a cache hit
    const cachedResults2 = await getCachedRagResults({
      query: testText,
      partyShortName: 'AP',
      limit: 8,
      minSimilarity: 0.6,
      requestId,
    });
    console.log('Second RAG lookup (should be hit):', cachedResults2 ? 'HIT' : 'MISS');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    // End performance session
    performanceLogger.endSession(requestId);
    
    console.log('\n📋 Check the performance-logs.jsonl file for detailed metrics');
    console.log('Look for operations like:');
    console.log('  - embedding-cache-read (miss/hit)');
    console.log('  - embedding-cache-write');
    console.log('  - rag-cache-read (miss/hit)');
    console.log('  - rag-cache-write');
  }
}

// Run the test
testCacheLogging();