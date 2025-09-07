import { RPCHandler } from '@orpc/server/fetch';
import type { NextRequest } from 'next/server';
import { createContext } from '@/lib/context';
import { generateRequestId, performanceLogger } from '@/lib/performance-logger';
import { appRouter } from '@/routers';

const USER_AGENT_MAX_LENGTH = 100;
const handler = new RPCHandler(appRouter);

async function handleRequest(req: NextRequest) {
  const httpRequestId = generateRequestId();

  // Start tracking HTTP request
  performanceLogger.startSession(`http-${httpRequestId}`);
  performanceLogger.logMilestone(
    `http-${httpRequestId}`,
    'http-request-received',
    {
      method: req.method,
      url: req.url,
      userAgent:
        req.headers.get('user-agent')?.substring(0, USER_AGENT_MAX_LENGTH) ||
        'unknown',
      contentLength: req.headers.get('content-length') || '0',
    }
  );

  try {
    const { result: response } = await performanceLogger.timeAsync(
      `http-${httpRequestId}`,
      'orpc-handler-execution',
      async () => {
        const handlerResult = await handler.handle(req, {
          prefix: '/rpc',
          context: await createContext(req),
        });
        return (
          handlerResult.response ?? new Response('Not found', { status: 404 })
        );
      },
      {
        prefix: '/rpc',
        url: req.url,
      }
    );

    performanceLogger.logMilestone(
      `http-${httpRequestId}`,
      'http-response-ready',
      {
        status: response.status,
        contentType: response.headers.get('content-type') || 'unknown',
      }
    );

    performanceLogger.endSession(`http-${httpRequestId}`);
    return response;
  } catch (error) {
    performanceLogger.logMilestone(
      `http-${httpRequestId}`,
      'http-request-error',
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    );
    performanceLogger.endSession(`http-${httpRequestId}`);
    throw error;
  }
}

export const GET = handleRequest;
export const POST = handleRequest;
export const PUT = handleRequest;
export const PATCH = handleRequest;
export const DELETE = handleRequest;
