import { createHash } from 'node:crypto';
import { performanceLogger } from '../../../lib/performance-logger';
import { executeRedisCommand, getRedisClient } from '../../../lib/redis';
import type { RetrievalResult } from '../types';

const RAG_CACHE_TTL = 60 * 60 * 24; // 24 hours
const DAYS_IN_WEEK = 7;
const EMBEDDING_CACHE_TTL = 60 * 60 * 24 * DAYS_IN_WEEK; // 7 days
const CACHE_KEY_PREVIEW_LENGTH = 16;

type CachedRagResult = {
  results: RetrievalResult[];
  timestamp: number;
};

type CachedEmbedding = {
  embedding: number[];
  timestamp: number;
};

/**
 * Generate a cache key for RAG search results
 */
function generateRagCacheKey(
  query: string,
  partyShortName: string,
  limit: number,
  minSimilarity: number
): string {
  const input = `${query.toLowerCase().trim()}:${partyShortName.toLowerCase()}:${limit}:${minSimilarity}`;
  const hash = createHash('sha256').update(input).digest('hex');
  return `rag:search:${hash}`;
}

/**
 * Generate a cache key for embeddings
 */
function generateEmbeddingCacheKey(text: string): string {
  const normalizedText = text.replace(/\\n/g, ' ').trim().toLowerCase();
  const hash = createHash('sha256').update(normalizedText).digest('hex');
  return `rag:embedding:${hash}`;
}

/**
 * Cache RAG search results
 */
export async function cacheRagResults(params: {
  query: string;
  partyShortName: string;
  limit: number;
  minSimilarity: number;
  results: RetrievalResult[];
  requestId?: string;
}): Promise<void> {
  const { query, partyShortName, limit, minSimilarity, results, requestId } =
    params;
  const reqId = requestId || 'unknown';

  try {
    const startTime = performanceLogger.startTimer(reqId, 'rag-cache-write', {
      partyShortName,
      resultsCount: results.length,
      queryLength: query.length,
    });

    const redis = await getRedisClient();
    const key = generateRagCacheKey(
      query,
      partyShortName,
      limit,
      minSimilarity
    );

    const cached: CachedRagResult = {
      results,
      timestamp: Date.now(),
    };

    await executeRedisCommand(
      'setex',
      () => redis.setEx(key, RAG_CACHE_TTL, JSON.stringify(cached)),
      reqId
    );

    performanceLogger.endTimer(reqId, 'rag-cache-write', startTime, {
      status: 'success',
      cacheKey: `${key.substring(0, CACHE_KEY_PREVIEW_LENGTH)}...`, // Log partial key for debugging
      resultsCount: results.length,
    });
  } catch (error) {
    performanceLogger.logMilestone(reqId, 'rag-cache-write-failed', {
      partyShortName,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    // Don't throw - caching is non-critical
  }
}

/**
 * Get cached RAG search results
 */
export async function getCachedRagResults(params: {
  query: string;
  partyShortName: string;
  limit: number;
  minSimilarity: number;
  requestId?: string;
}): Promise<RetrievalResult[] | null> {
  const { query, partyShortName, limit, minSimilarity, requestId } = params;
  const reqId = requestId || 'unknown';

  try {
    const startTime = performanceLogger.startTimer(reqId, 'rag-cache-read', {
      partyShortName,
      queryLength: query.length,
    });

    const redis = await getRedisClient();
    const key = generateRagCacheKey(
      query,
      partyShortName,
      limit,
      minSimilarity
    );

    const cached = await executeRedisCommand(
      'get',
      () => redis.get(key),
      reqId
    );
    if (!cached) {
      performanceLogger.endTimer(reqId, 'rag-cache-read', startTime, {
        status: 'miss',
        cacheKey: `${key.substring(0, CACHE_KEY_PREVIEW_LENGTH)}...`,
      });
      return null;
    }

    const parsed: CachedRagResult = JSON.parse(cached);

    performanceLogger.endTimer(reqId, 'rag-cache-read', startTime, {
      status: 'hit',
      cacheKey: `${key.substring(0, CACHE_KEY_PREVIEW_LENGTH)}...`,
      resultsCount: parsed.results.length,
      cacheAge: Date.now() - parsed.timestamp,
    });

    return parsed.results;
  } catch (error) {
    performanceLogger.logMilestone(reqId, 'rag-cache-read-failed', {
      partyShortName,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return null;
  }
}

/**
 * Cache an embedding
 */
export async function cacheEmbedding(
  text: string,
  embedding: number[],
  requestId?: string
): Promise<void> {
  const reqId = requestId || 'unknown';

  try {
    const startTime = performanceLogger.startTimer(
      reqId,
      'embedding-cache-write',
      {
        inputLength: text.length,
        embeddingDimensions: embedding.length,
      }
    );

    const redis = await getRedisClient();
    const key = generateEmbeddingCacheKey(text);

    const cached: CachedEmbedding = {
      embedding,
      timestamp: Date.now(),
    };

    await executeRedisCommand(
      'setex',
      () => redis.setEx(key, EMBEDDING_CACHE_TTL, JSON.stringify(cached)),
      reqId
    );

    performanceLogger.endTimer(reqId, 'embedding-cache-write', startTime, {
      status: 'success',
      cacheKey: `${key.substring(0, CACHE_KEY_PREVIEW_LENGTH)}...`,
    });
  } catch (error) {
    performanceLogger.logMilestone(reqId, 'embedding-cache-write-failed', {
      inputLength: text.length,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    // Don't throw - caching is non-critical
  }
}

/**
 * Get cached embedding
 */
export async function getCachedEmbedding(
  text: string,
  requestId?: string
): Promise<number[] | null> {
  const reqId = requestId || 'unknown';

  try {
    const startTime = performanceLogger.startTimer(
      reqId,
      'embedding-cache-read',
      {
        inputLength: text.length,
      }
    );

    const redis = await getRedisClient();
    const key = generateEmbeddingCacheKey(text);

    const cached = await executeRedisCommand(
      'get',
      () => redis.get(key),
      reqId
    );
    if (!cached) {
      performanceLogger.endTimer(reqId, 'embedding-cache-read', startTime, {
        status: 'miss',
        cacheKey: `${key.substring(0, CACHE_KEY_PREVIEW_LENGTH)}...`,
      });
      return null;
    }

    const parsed: CachedEmbedding = JSON.parse(cached);

    performanceLogger.endTimer(reqId, 'embedding-cache-read', startTime, {
      status: 'hit',
      cacheKey: `${key.substring(0, CACHE_KEY_PREVIEW_LENGTH)}...`,
      embeddingDimensions: parsed.embedding.length,
      cacheAge: Date.now() - parsed.timestamp,
    });

    return parsed.embedding;
  } catch (error) {
    performanceLogger.logMilestone(reqId, 'embedding-cache-read-failed', {
      inputLength: text.length,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return null;
  }
}

/**
 * Clear all RAG cache entries (useful for debugging)
 */
export async function clearRagCache(): Promise<void> {
  try {
    const redis = await getRedisClient();
    const keys = await executeRedisCommand(
      'keys',
      () => redis.keys('rag:*'),
      'cache-clear'
    );

    if (keys.length > 0) {
      await executeRedisCommand('del', () => redis.del(keys), 'cache-clear');
    }
  } catch (_error) {
    // Cache clearing is non-critical
  }
}

/**
 * Get cache statistics
 */
export async function getRagCacheStats(): Promise<{
  searchCacheSize: number;
  embeddingCacheSize: number;
}> {
  try {
    const redis = await getRedisClient();
    const [searchKeys, embeddingKeys] = await Promise.all([
      executeRedisCommand(
        'keys',
        () => redis.keys('rag:search:*'),
        'cache-stats'
      ),
      executeRedisCommand(
        'keys',
        () => redis.keys('rag:embedding:*'),
        'cache-stats'
      ),
    ]);

    return {
      searchCacheSize: searchKeys.length,
      embeddingCacheSize: embeddingKeys.length,
    };
  } catch (_error) {
    return {
      searchCacheSize: 0,
      embeddingCacheSize: 0,
    };
  }
}
