import { z } from 'zod';
import { getRagCacheStats } from '../domains/rag/services/rag-cache-service';
import { publicProcedure } from '../lib/orpc';
import { getRedisHealth } from '../lib/redis';

export const healthRouter = {
  redis: publicProcedure
    .output(
      z.object({
        connected: z.boolean(),
        connectionTime: z.number().optional(),
        lastError: z.string().optional(),
        info: z
          .object({
            memory: z.object({
              used: z.string(),
              peak: z.string(),
              fragmentation: z.string(),
            }),
            stats: z.object({
              totalConnections: z.number(),
              totalCommands: z.number(),
              instantaneousOps: z.number(),
            }),
            latency: z.number().optional(),
          })
          .optional(),
        cacheStats: z.object({
          searchCacheSize: z.number(),
          embeddingCacheSize: z.number(),
        }),
      })
    )
    .handler(async () => {
      const [redisHealth, cacheStats] = await Promise.all([
        getRedisHealth(),
        getRagCacheStats(),
      ]);

      return {
        ...redisHealth,
        cacheStats,
      };
    }),

  system: publicProcedure
    .output(
      z.object({
        status: z.string(),
        timestamp: z.string(),
        uptime: z.number(),
        redis: z.object({
          connected: z.boolean(),
          latency: z.number().optional(),
        }),
        cache: z.object({
          totalEntries: z.number(),
          searchEntries: z.number(),
          embeddingEntries: z.number(),
        }),
      })
    )
    .handler(async () => {
      const startTime = Date.now();

      const [redisHealth, cacheStats] = await Promise.all([
        getRedisHealth(),
        getRagCacheStats(),
      ]);

      const _healthCheckDuration = Date.now() - startTime;

      return {
        status: redisHealth.connected ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        redis: {
          connected: redisHealth.connected,
          latency: redisHealth.info?.latency,
        },
        cache: {
          totalEntries:
            cacheStats.searchCacheSize + cacheStats.embeddingCacheSize,
          searchEntries: cacheStats.searchCacheSize,
          embeddingEntries: cacheStats.embeddingCacheSize,
        },
      };
    }),
};
