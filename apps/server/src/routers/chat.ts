import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { streamToEventIterator } from '@orpc/server';
import { convertToModelMessages, streamText } from 'ai';
import { z } from 'zod';
import { getSystemPrompt, MODEL } from '../domains/chat';
import { getPartyName, partyExists } from '../domains/parties';
import { buildRagContext } from '../domains/rag';
import { publicProcedure } from '../lib/orpc';
import {
  generateRequestId,
  performanceLogger,
} from '../lib/performance-logger';

const chatInputSchema = z.object({
  messages: z.array(z.any()).describe('Array of UI messages from the chat'),
  partyShortName: z
    .string()
    .optional()
    .describe('Specific party short name for party-based responses'),
});

const openrouter = createOpenRouter({
  apiKey: process.env.OPEN_ROUTER_API_KEY,
});

export const chatRouter = {
  chat: publicProcedure.input(chatInputSchema).handler(async ({ input }) => {
    const { messages, partyShortName } = input;
    const requestId = generateRequestId();

    // Start performance tracking session
    performanceLogger.startSession(requestId);

    performanceLogger.logMilestone(requestId, 'chat-request-received', {
      messageCount: messages.length,
      partyShortName: partyShortName || null,
    });

    // Validate party exists if partyShortName is provided
    let partyName: string | null = null;
    if (partyShortName) {
      if (!partyExists(partyShortName)) {
        performanceLogger.endSession(requestId);
        throw new Error(`Party not found: ${partyShortName}`);
      }
      partyName = getPartyName(partyShortName);
    }

    // Get RAG context for party-based responses
    const ragContext = await buildRagContext(
      partyName,
      messages,
      partyShortName,
      requestId
    );

    const result = streamText({
      model: openrouter(MODEL),
      messages: convertToModelMessages(messages),
      providerOptions: {
        openai: {
          reasoning_effort: 'minimal',
        },
      },
      system: partyName
        ? getSystemPrompt(partyName, ragContext)
        : 'Du er en nyttig assistent som kan svare på generelle spörsmål.',
    });

    performanceLogger.logMilestone(requestId, 'stream-initiated', {
      hasRagContext: !!ragContext,
    });

    return streamToEventIterator(result.toUIMessageStream());
  }),
};
