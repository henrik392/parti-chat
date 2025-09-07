import { createHash } from 'node:crypto';
import { getRedisClient } from '../../../lib/redis';
import type { RetrievalResult } from '../types';

const RAG_CACHE_TTL = 60 * 60 * 24; // 24 hours
const DAYS_IN_WEEK = 7;
const EMBEDDING_CACHE_TTL = 60 * 60 * 24 * DAYS_IN_WEEK; // 7 days

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
}): Promise<void> {
  const { query, partyShortName, limit, minSimilarity, results } = params;
  try {
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

    await redis.setEx(key, RAG_CACHE_TTL, JSON.stringify(cached));
  } catch (_error) {
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
}): Promise<RetrievalResult[] | null> {
  const { query, partyShortName, limit, minSimilarity } = params;
  try {
    const redis = await getRedisClient();
    const key = generateRagCacheKey(
      query,
      partyShortName,
      limit,
      minSimilarity
    );

    const cached = await redis.get(key);
    if (!cached) {
      return null;
    }

    const parsed: CachedRagResult = JSON.parse(cached);
    return parsed.results;
  } catch (_error) {
    return null;
  }
}

/**
 * Cache an embedding
 */
export async function cacheEmbedding(
  text: string,
  embedding: number[]
): Promise<void> {
  try {
    const redis = await getRedisClient();
    const key = generateEmbeddingCacheKey(text);

    const cached: CachedEmbedding = {
      embedding,
      timestamp: Date.now(),
    };

    await redis.setEx(key, EMBEDDING_CACHE_TTL, JSON.stringify(cached));
  } catch (_error) {
    // Don't throw - caching is non-critical
  }
}

/**
 * Get cached embedding
 */
export async function getCachedEmbedding(
  text: string
): Promise<number[] | null> {
  try {
    const redis = await getRedisClient();
    const key = generateEmbeddingCacheKey(text);

    const cached = await redis.get(key);
    if (!cached) {
      return null;
    }

    const parsed: CachedEmbedding = JSON.parse(cached);
    return parsed.embedding;
  } catch (_error) {
    return null;
  }
}

/**
 * Clear all RAG cache entries (useful for debugging)
 */
export async function clearRagCache(): Promise<void> {
  try {
    const redis = await getRedisClient();
    const keys = await redis.keys('rag:*');

    if (keys.length > 0) {
      await redis.del(keys);
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
      redis.keys('rag:search:*'),
      redis.keys('rag:embedding:*'),
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
