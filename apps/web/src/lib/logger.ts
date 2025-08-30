import pino from 'pino';

// Client-side logger
export const logger = pino({
  level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
  browser: {
    asObject: false,
  },
});
