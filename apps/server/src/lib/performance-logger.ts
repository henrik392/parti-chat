import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

type PerformanceMetric = {
  timestamp: string;
  requestId: string;
  operation: string;
  duration: number;
  metadata?: Record<string, unknown>;
  phase: 'start' | 'end' | 'milestone';
};

type TimingSession = {
  requestId: string;
  startTime: number;
  metrics: PerformanceMetric[];
};

class PerformanceLogger {
  private readonly sessions = new Map<string, TimingSession>();
  private readonly logFilePath: string;

  constructor() {
    // Create logs directory in server root
    this.logFilePath = join(process.cwd(), 'performance-logs.jsonl');

    // Log startup
    this.logToFile({
      timestamp: new Date().toISOString(),
      requestId: 'system',
      operation: 'performance-logger-initialized',
      duration: 0,
      phase: 'milestone',
      metadata: { logFile: this.logFilePath },
    });
  }

  /**
   * Start a new timing session for a request
   */
  startSession(requestId: string): void {
    const now = Date.now();
    this.sessions.set(requestId, {
      requestId,
      startTime: now,
      metrics: [],
    });

    this.logToFile({
      timestamp: new Date().toISOString(),
      requestId,
      operation: 'session-start',
      duration: 0,
      phase: 'start',
    });
  }

  /**
   * Start timing an operation
   */
  startTimer(
    requestId: string,
    operation: string,
    metadata?: Record<string, unknown>
  ): number {
    const startTime = Date.now();

    this.logToFile({
      timestamp: new Date().toISOString(),
      requestId,
      operation: `${operation}-start`,
      duration: 0,
      phase: 'start',
      metadata,
    });

    return startTime;
  }

  /**
   * End timing an operation and log the duration
   */
  endTimer(
    requestId: string,
    operation: string,
    startTime: number,
    metadata?: Record<string, unknown>
  ): number {
    const endTime = Date.now();
    const duration = endTime - startTime;

    const metric: PerformanceMetric = {
      timestamp: new Date().toISOString(),
      requestId,
      operation,
      duration,
      phase: 'end',
      metadata,
    };

    // Store in session
    const session = this.sessions.get(requestId);
    if (session) {
      session.metrics.push(metric);
    }

    // Log to file
    this.logToFile(metric);

    return duration;
  }

  /**
   * Log a milestone without timing
   */
  logMilestone(
    requestId: string,
    operation: string,
    metadata?: Record<string, unknown>
  ): void {
    this.logToFile({
      timestamp: new Date().toISOString(),
      requestId,
      operation,
      duration: 0,
      phase: 'milestone',
      metadata,
    });
  }

  /**
   * End a session and log summary
   */
  endSession(requestId: string): void {
    const session = this.sessions.get(requestId);
    if (!session) {
      return;
    }

    const totalDuration = Date.now() - session.startTime;

    // Calculate operation summaries
    const operationSummary = session.metrics
      .filter((m) => m.phase === 'end')
      .reduce(
        (acc, metric) => {
          if (!acc[metric.operation]) {
            acc[metric.operation] = { count: 0, totalTime: 0, avgTime: 0 };
          }
          acc[metric.operation].count++;
          acc[metric.operation].totalTime += metric.duration;
          acc[metric.operation].avgTime =
            acc[metric.operation].totalTime / acc[metric.operation].count;
          return acc;
        },
        {} as Record<
          string,
          { count: number; totalTime: number; avgTime: number }
        >
      );

    this.logToFile({
      timestamp: new Date().toISOString(),
      requestId,
      operation: 'session-end',
      duration: totalDuration,
      phase: 'end',
      metadata: {
        totalOperations: session.metrics.length,
        operationSummary,
        sessionDuration: totalDuration,
      },
    });

    // Clean up
    this.sessions.delete(requestId);
  }

  /**
   * Helper to time an async function
   */
  async timeAsync<T>(
    requestId: string,
    operation: string,
    fn: () => Promise<T>,
    metadata?: Record<string, unknown>
  ): Promise<{ result: T; duration: number }> {
    const startTime = this.startTimer(requestId, operation, metadata);

    try {
      const result = await fn();
      const duration = this.endTimer(requestId, operation, startTime, {
        ...metadata,
        status: 'success',
      });
      return { result, duration };
    } catch (error) {
      this.endTimer(requestId, operation, startTime, {
        ...metadata,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Helper to time a sync function
   */
  timeSync<T>(
    requestId: string,
    operation: string,
    fn: () => T,
    metadata?: Record<string, unknown>
  ): { result: T; duration: number } {
    const startTime = this.startTimer(requestId, operation, metadata);

    try {
      const result = fn();
      const duration = this.endTimer(requestId, operation, startTime, {
        ...metadata,
        status: 'success',
      });
      return { result, duration };
    } catch (error) {
      this.endTimer(requestId, operation, startTime, {
        ...metadata,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  private logToFile(metric: PerformanceMetric): void {
    try {
      const logLine = `${JSON.stringify(metric)}\n`;
      writeFileSync(this.logFilePath, logLine, { flag: 'a' });
    } catch (_error) {
      // Fail silently in production - intentionally left empty
    }
  }

  /**
   * Get current session metrics (for debugging)
   */
  getSessionMetrics(requestId: string): PerformanceMetric[] | undefined {
    return this.sessions.get(requestId)?.metrics;
  }
}

// Singleton instance
export const performanceLogger = new PerformanceLogger();

// Convenience function to generate request IDs
export function generateRequestId(): string {
  const RADIX_BASE = 36;
  const SUBSTRING_START = 2;
  const SUBSTRING_END = 9;
  return `req_${Date.now()}_${Math.random().toString(RADIX_BASE).substring(SUBSTRING_START, SUBSTRING_END)}`;
}
