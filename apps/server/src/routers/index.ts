import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import type { RouterClient } from '@orpc/server';
import { streamToEventIterator } from '@orpc/server';
import { convertToModelMessages, streamText } from 'ai';
import { z } from 'zod';
import {
  findRelevantContent,
  type RetrievalResult,
} from '../lib/embedding-generator';
import { publicProcedure } from '../lib/orpc';
import { generateSystemPrompt } from '../lib/system-prompt';
import { db } from '../db';
import { parties, partyPrograms } from '../db/schema';
import { eq } from 'drizzle-orm';

// Constants for RAG
const DEFAULT_CONTENT_LIMIT = 5;
const DEFAULT_SIMILARITY_THRESHOLD = 0.6;

const chatInputSchema = z.object({
  messages: z.array(z.any()).describe('Array of UI messages from the chat'),
  partyId: z
    .string()
    .optional()
    .describe('Specific party ID for party-based responses'),
});

// Party data with actual database party IDs (UUIDs)
const PARTIES = [
  { id: '96bab927-4bc8-41d4-a82f-986f02245a65', name: 'Arbeiderpartiet', shortName: 'AP', color: '#E5001A' },
  { id: 'c5da6b28-f27b-4b80-81fe-2476733c04d9', name: 'Fremskrittspartiet', shortName: 'FrP', color: '#003C7F' },
  { id: '8b13ec72-4b8c-4544-814a-d9d5fe263713', name: 'Høyre', shortName: 'H', color: '#0065F1' },
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
  { id: '48f4b362-91ef-44fe-8787-06b7cd06a480', name: 'Rødt', shortName: 'Rødt', color: '#D50000' },
  { id: 'a1ea74a7-bac3-40ba-a748-199bce9f8a79', name: 'Senterpartiet', shortName: 'SP', color: '#00843D' },
  {
    id: 'eff941a7-e564-4be1-8f03-0c59d1a140f1',
    name: 'Sosialistisk Venstreparti',
    shortName: 'SV',
    color: '#C4002C',
  },
  { id: 'e20772a9-5612-418c-95d1-2be5a04fdf34', name: 'Venstre', shortName: 'V', color: '#006B38' },
] as const;

const openrouter = createOpenRouter({
  apiKey: process.env.OPEN_ROUTER_API_KEY,
});

export const appRouter = {
  healthCheck: publicProcedure.handler(() => {
    return 'OK';
  }),

  chat: publicProcedure.input(chatInputSchema).handler(async ({ input }) => {
    const { messages, partyId } = input;

    // If no party ID is provided, use the generic chat
    if (!partyId) {
      const result = streamText({
        model: openrouter('openai/gpt-5-mini'),
        messages: convertToModelMessages(messages),
        system: 'You are a helpful assistant.',
      });
      return result.toUIMessageStreamResponse();
    }

    // Find the party information
    const party = PARTIES.find((p) => p.id === partyId);
    if (!party) {
      throw new Error(`Party not found: ${partyId}`);
    }

    // Get the user's question from the last message
    const lastMessage = messages.at(-1);
    const userQuestion =
      typeof lastMessage?.content === 'string'
        ? lastMessage.content
        : lastMessage?.content[0]?.text || '';

    if (!userQuestion) {
      throw new Error('No question provided');
    }

    // Debug: Let's see what parties are actually in the database
    const allParties = await db.select().from(parties).limit(5);
    console.log('All parties in DB:', allParties);

    // The partyId we're looking for should match a party.id
    // Let's use that party ID directly in the RAG search
    const relevantContent = await findRelevantContent(
      userQuestion,
      partyId, // This should be the party.id like 'mdg' 
      DEFAULT_CONTENT_LIMIT,
      DEFAULT_SIMILARITY_THRESHOLD
    );

    // Build context from retrieved content
    let ragContext = '';
    let ragCitations = '';

    if (relevantContent.length === 0) {
      ragContext = `Ingen relevant informasjon funnet i ${party.name}s partiprogram.`;
    } else {
      ragContext = relevantContent
        .map(
          (contentResult: RetrievalResult) =>
            `Fra ${party.name}s partiprogram${contentResult.chapterTitle ? ` (${contentResult.chapterTitle})` : ''}: ${contentResult.content}`
        )
        .join('\n\n');

      ragCitations = relevantContent
        .map(
          (citationResult: RetrievalResult, citationIndex: number) =>
            `[${citationIndex + 1}] ${citationResult.chapterTitle || 'Ukjent kapittel'}${citationResult.pageNumber ? `, side ${citationResult.pageNumber}` : ''}`
        )
        .join('\n');
    }

    // Create system message with party-specific context
    const systemMessage = generateSystemPrompt(
      party.name,
      ragContext,
      ragCitations
    );

    console.log('Processing chat request:', {
      party: party.name,
      partyIdUsed: partyId,
      ragContextLength: ragContext.length,
      ragContext: `${ragContext.substring(0, 200)}...`,
      userQuestion,
      relevantContentCount: relevantContent.length,
    });

    try {
      // Temporarily return a simple response to test the flow
      if (relevantContent.length === 0) {
        return new Response(
          `Ingen relevant informasjon funnet i ${party.name}s partiprogram.`
        );
      }

      console.log('Generating response from model');

      const result = streamText({
        model: openrouter('openai/gpt-4o-mini'),
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: userQuestion },
        ],
        temperature: 0.1, // Low temperature for factual responses
      });

      return result.toUIMessageStreamResponse();
    } catch (error) {
      console.error('Failed to generate stream:', error);
      throw error;
    }
  }),
};
export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
