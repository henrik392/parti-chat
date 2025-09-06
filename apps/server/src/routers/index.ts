import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import type { RouterClient } from '@orpc/server';
import { streamToEventIterator } from '@orpc/server';
import { convertToModelMessages, stepCountIs, streamText, tool } from 'ai';
import { z } from 'zod';
import {
  findRelevantContent,
  type RetrievalResult,
} from '../lib/embedding-generator';
import { publicProcedure } from '../lib/orpc';
import {
  generateRequestId,
  performanceLogger,
} from '../lib/performance-logger';

// Constants for RAG
const DEFAULT_CONTENT_LIMIT = 5;
const DEFAULT_SIMILARITY_THRESHOLD = 0.6;
const MAX_STEPS = 5;
const MODEL = 'openai/gpt-4o';

// Proactive RAG cache to store results before model decides to call tool
const proactiveRAGCache = new Map<string, Promise<RetrievalResult[]>>();
const SECONDS_IN_MINUTE = 60;
const MS_IN_SECOND = 1000;
const MINUTES_TO_MS = SECONDS_IN_MINUTE * MS_IN_SECOND;
const CLEANUP_DELAY_MINUTES = 5;
const CACHE_CLEANUP_DELAY = CLEANUP_DELAY_MINUTES * MINUTES_TO_MS;
const CACHE_KEY_SUBSTRING_LENGTH = 50;
const SYSTEM_PROMPT_LENGTH_WITH_PARTY = 200;
const SYSTEM_PROMPT_LENGTH_NO_PARTY = 80;

/**
 * Start proactive RAG search if we have party and user message
 */
function startProactiveRAG(
  party: (typeof PARTIES)[number] | null,
  messages: Array<{ content?: string }>,
  partyShortName: string | undefined,
  requestId: string
): void {
  if (!party || messages.length === 0) {
    return;
  }

  const lastMessage = messages.at(-1);
  if (!lastMessage?.content || typeof lastMessage.content !== 'string') {
    return;
  }

  const cacheKey = `${partyShortName}-${lastMessage.content}`;

  // Check if we already have this search cached
  if (proactiveRAGCache.has(cacheKey)) {
    performanceLogger.logMilestone(requestId, 'proactive-rag-cache-hit', {
      partyShortName,
      cacheKey: cacheKey.substring(0, CACHE_KEY_SUBSTRING_LENGTH),
    });
    return;
  }

  performanceLogger.logMilestone(requestId, 'proactive-rag-started', {
    partyShortName,
    questionLength: lastMessage.content.length,
  });

  // Start the RAG search proactively
  const proactiveRAGPromise = findRelevantContent(
    lastMessage.content,
    partyShortName || '',
    DEFAULT_CONTENT_LIMIT,
    DEFAULT_SIMILARITY_THRESHOLD,
    requestId
  );

  proactiveRAGCache.set(cacheKey, proactiveRAGPromise);

  // Clean up cache after 5 minutes to prevent memory leaks
  setTimeout(() => {
    proactiveRAGCache.delete(cacheKey);
  }, CACHE_CLEANUP_DELAY);
}

const chatInputSchema = z.object({
  messages: z.array(z.any()).describe('Array of UI messages from the chat'),
  partyShortName: z
    .string()
    .optional()
    .describe('Specific party short name for party-based responses'),
});

// Party data with actual database party IDs (UUIDs)
const PARTIES = [
  {
    id: '96bab927-4bc8-41d4-a82f-986f02245a65',
    name: 'Arbeiderpartiet',
    shortName: 'AP',
    color: '#E5001A',
  },
  {
    id: 'c5da6b28-f27b-4b80-81fe-2476733c04d9',
    name: 'Fremskrittspartiet',
    shortName: 'FrP',
    color: '#003C7F',
  },
  {
    id: '8b13ec72-4b8c-4544-814a-d9d5fe263713',
    name: 'Høyre',
    shortName: 'H',
    color: '#0065F1',
  },
  {
    id: '839b43bd-0d67-4126-acfc-c7537a79d390',
    name: 'Kristelig Folkeparti',
    shortName: 'KrF',
    color: '#F9C835',
  },
  {
    id: '1d09e1ee-c3b4-4777-aafb-d2eb5bb2a830',
    name: 'Miljøpartiet De Grønne',
    shortName: 'MDG',
    color: '#4B9F44',
  },
  {
    id: '48f4b362-91ef-44fe-8787-06b7cd06a480',
    name: 'Rødt',
    shortName: 'Rødt',
    color: '#D50000',
  },
  {
    id: 'a1ea74a7-bac3-40ba-a748-199bce9f8a79',
    name: 'Senterpartiet',
    shortName: 'SP',
    color: '#00843D',
  },
  {
    id: 'eff941a7-e564-4be1-8f03-0c59d1a140f1',
    name: 'Sosialistisk Venstreparti',
    shortName: 'SV',
    color: '#C4002C',
  },
  {
    id: 'e20772a9-5612-418c-95d1-2be5a04fdf34',
    name: 'Venstre',
    shortName: 'V',
    color: '#006B38',
  },
] as const;

// Environment variables will be loaded at runtime

const openrouter = createOpenRouter({
  apiKey: process.env.OPEN_ROUTER_API_KEY,
});

export const appRouter = {
  healthCheck: publicProcedure.handler(() => {
    return 'OK';
  }),

  chat: publicProcedure.input(chatInputSchema).handler(({ input }) => {
    const { messages, partyShortName } = input;
    const requestId = generateRequestId();

    // Start performance tracking session
    performanceLogger.startSession(requestId);
    performanceLogger.logMilestone(requestId, 'chat-request-received', {
      messageCount: messages.length,
      partyShortName: partyShortName || null,
      lastMessageLength: messages.at(-1)?.content?.length || 0,
    });

    // Find the party information if partyShortName is provided
    let party: (typeof PARTIES)[number] | null = null;
    if (partyShortName) {
      party = PARTIES.find((p) => p.shortName === partyShortName) || null;
      if (!party) {
        performanceLogger.endSession(requestId);
        throw new Error(`Party not found: ${partyShortName}`);
      }
    }

    // Proactive RAG: Start searching immediately if we have a party and user message
    startProactiveRAG(party, messages, partyShortName, requestId);

    performanceLogger.logMilestone(requestId, 'model-stream-starting', {
      model: MODEL,
      maxSteps: MAX_STEPS,
      systemPromptLength: party
        ? SYSTEM_PROMPT_LENGTH_WITH_PARTY
        : SYSTEM_PROMPT_LENGTH_NO_PARTY,
    });

    const result = streamText({
      model: openrouter(MODEL),
      messages: convertToModelMessages(messages),
      stopWhen: stepCountIs(MAX_STEPS),
      providerOptions: {
        openai: {
          reasoning_effort: 'minimal', // Decreases autonomous exploration
        },
      },
      system: party
        ? `Du er en nyttig assistent som svarer basert på ${party.name}s partiprogram.
           Bruk verktøyet for å søke etter relevant informasjon i partiprogrammet før du svarer.
           Svar kun basert på informasjon fra partiprogrammet.
           Hvis ingen relevant informasjon finnes, svar "Ikke omtalt i ${party.name}s partiprogram."`
        : 'Du er en nyttig assistent som kan svare på generelle spørsmål.',
      tools: {
        getPartyInformation: tool({
          description: `Hent informasjon fra ${party?.name || 'parti'}programmet for å svare på brukerens spørsmål`,
          inputSchema: z.object({}),
          execute: async () => {
            // Use the user's original message directly for cache matching
            const lastMessage = messages.at(-1);
            const question = lastMessage?.content || '';
            try {
              performanceLogger.logMilestone(
                requestId,
                'tool-execution-started',
                {
                  toolName: 'getPartyInformation',
                  questionLength: question.length,
                  partyShortName: partyShortName || 'unknown',
                }
              );

              // Always wait for proactive RAG results if available
              const proactiveCacheKey = `${partyShortName}-${question}`;
              let relevantContent: RetrievalResult[];

              if (proactiveRAGCache.has(proactiveCacheKey)) {
                performanceLogger.logMilestone(
                  requestId,
                  'waiting-for-proactive-rag',
                  {
                    cacheKey: proactiveCacheKey.substring(
                      0,
                      CACHE_KEY_SUBSTRING_LENGTH
                    ),
                  }
                );

                // Wait for the proactive search to complete
                const proactivePromise =
                  proactiveRAGCache.get(proactiveCacheKey);
                if (!proactivePromise) {
                  throw new Error('Proactive RAG promise not found in cache');
                }

                const { result: proactiveResult } =
                  await performanceLogger.timeAsync(
                    requestId,
                    'proactive-rag-wait',
                    () => proactivePromise,
                    {
                      cacheKey: proactiveCacheKey.substring(
                        0,
                        CACHE_KEY_SUBSTRING_LENGTH
                      ),
                    }
                  );
                relevantContent = proactiveResult;

                // Clean up the cache entry since we've used it
                proactiveRAGCache.delete(proactiveCacheKey);
              } else {
                // Fallback to traditional RAG search if no proactive results
                performanceLogger.logMilestone(
                  requestId,
                  'fallback-to-traditional-rag',
                  {
                    questionLength: question.length,
                  }
                );

                const { result: ragResult } = await performanceLogger.timeAsync(
                  requestId,
                  'tool-rag-search-fallback',
                  () =>
                    findRelevantContent(
                      question,
                      partyShortName || '',
                      DEFAULT_CONTENT_LIMIT,
                      DEFAULT_SIMILARITY_THRESHOLD,
                      requestId
                    ),
                  {
                    questionLength: question.length,
                    partyShortName: partyShortName || 'unknown',
                  }
                );
                relevantContent = ragResult;
              }

              if (relevantContent.length === 0) {
                return `Ingen relevant informasjon funnet i ${party?.name || 'parti'}programmet.`;
              }

              // Format content with citation markers - timed for response formatting
              const { result: formattedResponse } = performanceLogger.timeSync(
                requestId,
                'tool-response-formatting',
                () => {
                  let responseText = '';
                  const citations: Array<{
                    content: string;
                    chapterTitle?: string;
                    pageNumber?: number;
                    similarity: number;
                  }> = [];

                  relevantContent.forEach((content: RetrievalResult, index) => {
                    const citationNumber = index + 1;
                    citations.push({
                      content: content.content,
                      chapterTitle: content.chapterTitle,
                      pageNumber: content.pageNumber,
                      similarity: content.similarity,
                    });

                    if (index === 0) {
                      responseText = `Basert på ${party?.name || 'parti'}programmet: ${content.content} [${citationNumber}]`;
                    } else {
                      responseText += ` Videre står det at ${content.content} [${citationNumber}]`;
                    }
                  });

                  // Return structured data that the AI can use to form a response with citations
                  return JSON.stringify({
                    text: responseText,
                    citations: citations.map((citation, index) => ({
                      id: index + 1,
                      content: citation.content,
                      chapterTitle: citation.chapterTitle || 'Ukjent kapittel',
                      pageNumber: citation.pageNumber,
                      similarity: citation.similarity,
                      source: `${party?.name} Partiprogram${citation.pageNumber ? ` - Side ${citation.pageNumber}` : ''}`,
                    })),
                  });
                },
                {
                  resultsCount: relevantContent.length,
                  totalContentLength: relevantContent.reduce(
                    (sum, r) => sum + r.content.length,
                    0
                  ),
                }
              );

              performanceLogger.logMilestone(
                requestId,
                'tool-execution-completed',
                {
                  toolName: 'getPartyInformation',
                  resultsFound: relevantContent.length,
                  responseLength: formattedResponse.length,
                }
              );

              return formattedResponse;
            } catch (_error) {
              return `Feil ved henting av informasjon fra ${party?.name || 'parti'}programmet.`;
            }
          },
        }),
      },
    });

    performanceLogger.logMilestone(requestId, 'stream-initiated', {
      model: MODEL,
      hasParty: !!party,
      toolsAvailable: 1,
    });

    // Note: We cannot await the stream completion here as it's streamed to client
    // The session will be ended when the stream processing completes on client side
    // For now, we'll track stream initiation time

    return streamToEventIterator(result.toUIMessageStream());
  }),
};
export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
