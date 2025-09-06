import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import type { RouterClient } from '@orpc/server';
import { streamToEventIterator } from '@orpc/server';
import { convertToModelMessages, streamText } from 'ai';
import { z } from 'zod';
import { findRelevantContent } from '../lib/embedding-generator';
import { publicProcedure } from '../lib/orpc';
import {
  generateRequestId,
  performanceLogger,
} from '../lib/performance-logger';

// Constants
const DEFAULT_CONTENT_LIMIT = 8; // Increased to get more potential matches
const DEFAULT_SIMILARITY_THRESHOLD = 0.6; // Lowered to be more inclusive
const MODEL = 'openai/gpt-5-chat';

// Similarity thresholds for relevance classification
const HIGH_SIMILARITY_THRESHOLD = 0.75;
const MEDIUM_SIMILARITY_THRESHOLD = 0.6;
const LOW_SIMILARITY_THRESHOLD = 0.5;
const DECIMAL_PRECISION = 100;

// Types
type MessagePart =
  | {
      type?: string;
      text?: string;
      content?: string;
    }
  | string;

type Message = {
  content?: string | object;
  parts?: MessagePart[];
  role?: string;
};

type FormattedSearchResult = {
  id: number;
  content: string;
  chapterTitle: string;
  pageNumber?: number;
  similarity: number;
  relevanceNote: string;
};

type RagContext = {
  party: (typeof PARTIES)[number];
  resultsCount: number;
  avgSimilarity: number;
  searchResults: FormattedSearchResult[];
  userQuestion: string;
};

/**
 * Extract text content from a message object
 */
function extractMessageContent(message: Message): string {
  if (typeof message?.content === 'string') {
    return message.content;
  }

  if (message?.parts && Array.isArray(message.parts)) {
    return message.parts
      .filter(
        (part: MessagePart) => typeof part === 'string' || part.type === 'text'
      )
      .map((part: MessagePart) =>
        typeof part === 'string' ? part : part.text || part.content || ''
      )
      .join(' ')
      .trim();
  }

  if (typeof message?.content === 'object' && message?.content) {
    return JSON.stringify(message.content);
  }

  return '';
}

/**
 * Get relevance note based on similarity score
 */
function getRelevanceNote(similarity: number): string {
  if (similarity > HIGH_SIMILARITY_THRESHOLD) {
    return 'Høy relevans';
  }
  if (similarity > MEDIUM_SIMILARITY_THRESHOLD) {
    return 'Middels relevans';
  }
  if (similarity > LOW_SIMILARITY_THRESHOLD) {
    return 'Lav relevans';
  }
  return 'Meget lav relevans';
}

/**
 * Get system prompt based on RAG context availability
 */
function getSystemPrompt(
  party: (typeof PARTIES)[number],
  ragContext: RagContext | null
) {
  if (ragContext) {
    const searchResultsText = ragContext.searchResults
      .map(
        (result) =>
          `[${result.id}] ${result.relevanceNote} (${result.similarity}) - ${result.chapterTitle}:\n${result.content}`
      )
      .join('\n\n');

    return `Du er en nyttig assistent som svarer basert på ${party.name}s partiprogram.

BRUKERENS SPØRSMÅL: "${ragContext.userQuestion}"

SØKERESULTATER FRA PARTIPROGRAMMET:
${searchResultsText}

INSTRUKSJONER:
- Vurder nøye om søkeresultatene faktisk svarer på brukerens spørsmål
- Hvis NOEN av søkeresultatene er relevante: Svar basert på informasjonen og referer til [nummer]
- Prioriter resultater med "Høy relevans" og "Middels relevans", men vurder også "Lav relevans" hvis de svarer på spørsmålet
- Hvis INGEN søkeresultater svarer på spørsmålet: Svar "Ikke omtalt i ${party.name}s partiprogram"
- Ikke gjett eller lag opp svar som ikke er direkte støttet av søkeresultatene`;
  }
  return `Du er en nyttig assistent som svarer basert på ${party.name}s partiprogram.
         Ingen relevant informasjon ble funnet for dette spørsmålet.
         Svar "Ikke omtalt i ${party.name}s partiprogram."`;
}

async function getRagContext(
  party: (typeof PARTIES)[number] | null,
  messages: Message[],
  partyShortName: string | undefined,
  requestId: string
): Promise<RagContext | null> {
  if (!party) {
    return null;
  }

  const lastMessage = messages.at(-1);
  const question = lastMessage ? extractMessageContent(lastMessage) : '';

  if (!question) {
    return null;
  }

  performanceLogger.logMilestone(requestId, 'rag-search-started', {
    questionLength: question.length,
    partyShortName: partyShortName || 'unknown',
  });

  const { result: relevantContent } = await performanceLogger.timeAsync(
    requestId,
    'rag-search',
    () =>
      findRelevantContent(
        question,
        partyShortName || '',
        DEFAULT_CONTENT_LIMIT,
        DEFAULT_SIMILARITY_THRESHOLD,
        requestId
      )
  );

  if (relevantContent.length > 0) {
    // Format the content with similarity scores for better model evaluation
    const formattedContent = relevantContent.map((result, index) => ({
      id: index + 1,
      content: result.content,
      chapterTitle: result.chapterTitle || 'Ukjent kapittel',
      pageNumber: result.pageNumber,
      similarity:
        Math.round(result.similarity * DECIMAL_PRECISION) / DECIMAL_PRECISION,
      relevanceNote: getRelevanceNote(result.similarity),
    }));

    const context = {
      party,
      resultsCount: relevantContent.length,
      avgSimilarity:
        Math.round(
          (relevantContent.reduce((sum, r) => sum + r.similarity, 0) /
            relevantContent.length) *
            DECIMAL_PRECISION
        ) / DECIMAL_PRECISION,
      searchResults: formattedContent,
      userQuestion: question, // Include the original question for context
    };

    performanceLogger.logMilestone(requestId, 'rag-context-prepared', {
      resultsCount: relevantContent.length,
      avgSimilarity: context.avgSimilarity,
      partyShortName: partyShortName || 'unknown',
    });

    return context;
  }

  performanceLogger.logMilestone(requestId, 'rag-context-no-results', {
    userQuestion: question,
    partyShortName: partyShortName || 'unknown',
    searchThreshold: DEFAULT_SIMILARITY_THRESHOLD,
    reason: 'No results above similarity threshold',
  });
  return null;
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

  chat: publicProcedure.input(chatInputSchema).handler(async ({ input }) => {
    const { messages, partyShortName } = input;
    const requestId = generateRequestId();

    // Start performance tracking session
    performanceLogger.startSession(requestId);

    performanceLogger.logMilestone(requestId, 'chat-request-received', {
      messageCount: messages.length,
      partyShortName: partyShortName || null,
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

    // Get RAG context for party-based responses
    const ragContext = await getRagContext(
      party,
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
      system: party
        ? getSystemPrompt(party, ragContext)
        : 'Du er en nyttig assistent som kan svare på generelle spørsmål.',
    });

    performanceLogger.logMilestone(requestId, 'stream-initiated', {
      hasRagContext: !!ragContext,
    });

    // Note: We cannot await the stream completion here as it's streamed to client
    // The session will be ended when the stream processing completes on client side
    // For now, we'll track stream initiation time

    return streamToEventIterator(result.toUIMessageStream());
  }),
};
export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
