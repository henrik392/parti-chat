import { createClient } from 'redis';
import { performanceLogger } from './performance-logger';

let client: ReturnType<typeof createClient> | null = null;
let connectionAttempts = 0;
let lastConnectionError: Error | null = null;

const MAX_RETRIES = 3;
const CONNECTION_TIMEOUT = 10_000; // 10 seconds
const RETRY_BASE_DELAY = 1000; // 1 second
const MAX_RETRY_DELAY = 5000; // 5 seconds
const KB_IN_BYTES = 1024;
const BYTES_TO_MB = KB_IN_BYTES * KB_IN_BYTES;
const PRECISION_MULTIPLIER = 100;
const SLOW_COMMAND_THRESHOLD = 1000; // 1 second

export async function getRedisClient() {
  if (!client) {
    const requestId = 'redis-connection';

    try {
      performanceLogger.logMilestone(requestId, 'redis-connection-attempt', {
        attempt: connectionAttempts + 1,
        maxRetries: MAX_RETRIES,
        url: process.env.REDIS_URL ? 'configured' : 'localhost',
      });

      client = createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        socket: {
          connectTimeout: CONNECTION_TIMEOUT,
        },
        commandsQueueMaxLength: 100,
      });

      client.on('error', (err) => {
        lastConnectionError = err;
        performanceLogger.logMilestone(requestId, 'redis-error', {
          error: err.message,
          connectionAttempts,
        });
      });

      client.on('connect', () => {
        connectionAttempts = 0;
        lastConnectionError = null;
        performanceLogger.logMilestone(requestId, 'redis-connected', {
          attemptsTaken: connectionAttempts,
        });
      });

      client.on('reconnecting', () => {
        performanceLogger.logMilestone(requestId, 'redis-reconnecting', {
          attempt: connectionAttempts + 1,
        });
      });

      client.on('ready', () => {
        performanceLogger.logMilestone(requestId, 'redis-ready', {});
      });

      const startTime = Date.now();
      await client.connect();
      const connectionTime = Date.now() - startTime;

      performanceLogger.logMilestone(requestId, 'redis-connection-success', {
        connectionTime,
        url: process.env.REDIS_URL ? 'configured' : 'localhost',
      });
    } catch (error) {
      connectionAttempts++;
      lastConnectionError =
        error instanceof Error ? error : new Error('Unknown Redis error');

      performanceLogger.logMilestone(requestId, 'redis-connection-failed', {
        attempt: connectionAttempts,
        error: lastConnectionError.message,
        willRetry: connectionAttempts < MAX_RETRIES,
      });

      client = null;

      if (connectionAttempts < MAX_RETRIES) {
        // Wait before retry with exponential backoff
        await new Promise((resolve) =>
          setTimeout(
            resolve,
            Math.min(connectionAttempts * RETRY_BASE_DELAY, MAX_RETRY_DELAY)
          )
        );
        return getRedisClient(); // Recursive retry
      }

      throw new Error(
        `Redis connection failed after ${MAX_RETRIES} attempts. Last error: ${lastConnectionError.message}`
      );
    }
  }

  return client;
}

export async function closeRedisConnection() {
  if (client) {
    await client.quit();
    client = null;
  }
}

/**
 * Get Redis connection health and performance metrics
 */
export async function getRedisHealth(): Promise<{
  connected: boolean;
  connectionTime?: number;
  lastError?: string;
  info?: {
    memory: {
      used: string;
      peak: string;
      fragmentation: string;
    };
    stats: {
      totalConnections: number;
      totalCommands: number;
      instantaneousOps: number;
    };
    latency?: number;
  };
}> {
  const requestId = 'redis-health-check';

  try {
    if (!client) {
      return {
        connected: false,
        lastError: 'No Redis client initialized',
      };
    }

    const startTime = Date.now();

    // Test basic connectivity with PING
    await client.ping();
    const pingLatency = Date.now() - startTime;

    // Get Redis info
    // Get basic info (not used directly but helps with monitoring)
    await client.info();
    const memoryInfo = await client.info('memory');
    const statsInfo = await client.info('stats');

    // Parse info strings
    const parseInfo = (infoStr: string) => {
      const result: Record<string, string | number> = {};
      for (const line of infoStr.split('\r\n')) {
        if (line.includes(':')) {
          const [key, value] = line.split(':');
          result[key] = Number.isNaN(Number(value)) ? value : Number(value);
        }
      }
      return result;
    };

    const memData = parseInfo(memoryInfo);
    const statsData = parseInfo(statsInfo);

    performanceLogger.logMilestone(requestId, 'redis-health-check-success', {
      pingLatency,
      memoryUsed: memData.used_memory,
      totalConnections: statsData.total_connections_received,
      instantaneousOps: statsData.instantaneous_ops_per_sec,
    });

    return {
      connected: true,
      connectionTime: pingLatency,
      info: {
        memory: {
          used: `${Math.round(((memData.used_memory as number) / BYTES_TO_MB) * PRECISION_MULTIPLIER) / PRECISION_MULTIPLIER}MB`,
          peak: `${Math.round(((memData.used_memory_peak as number) / BYTES_TO_MB) * PRECISION_MULTIPLIER) / PRECISION_MULTIPLIER}MB`,
          fragmentation: `${memData.mem_fragmentation_ratio}`,
        },
        stats: {
          totalConnections: statsData.total_connections_received as number,
          totalCommands: statsData.total_commands_processed as number,
          instantaneousOps: statsData.instantaneous_ops_per_sec as number,
        },
        latency: pingLatency,
      },
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';

    performanceLogger.logMilestone(requestId, 'redis-health-check-failed', {
      error: errorMessage,
      lastConnectionError: lastConnectionError?.message,
    });

    return {
      connected: false,
      lastError: errorMessage,
    };
  }
}

/**
 * Enhanced Redis command wrapper with performance monitoring
 */
export async function executeRedisCommand<T>(
  commandName: string,
  command: () => Promise<T>,
  requestId?: string
): Promise<T> {
  const reqId = requestId || 'redis-command';
  const startTime = performanceLogger.startTimer(
    reqId,
    `redis-${commandName}`,
    {
      command: commandName,
    }
  );

  try {
    const result = await command();

    performanceLogger.endTimer(reqId, `redis-${commandName}`, startTime, {
      status: 'success',
      command: commandName,
    });

    return result;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';

    performanceLogger.endTimer(reqId, `redis-${commandName}`, startTime, {
      status: 'error',
      command: commandName,
      error: errorMessage,
    });

    // Log slow commands (> 1 second) as warnings
    const duration = Date.now() - startTime;
    if (duration > SLOW_COMMAND_THRESHOLD) {
      performanceLogger.logMilestone(reqId, 'redis-slow-command', {
        command: commandName,
        duration,
        error: errorMessage,
      });
    }

    throw error;
  }
}
