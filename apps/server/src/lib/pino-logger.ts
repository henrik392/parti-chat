import pino from 'pino';

// Simple logger configuration that works with Bun
export const logger = pino({
  level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
  // Remove pino-pretty transport to avoid Bun compatibility issues
});
