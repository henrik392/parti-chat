import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import type { RouterClient } from '@orpc/server';
import { streamToEventIterator } from '@orpc/server';
import { convertToModelMessages, streamText } from 'ai';
import { z } from 'zod';
import { findRelevantContentByParties } from '../lib/embedding-generator';
import { protectedProcedure, publicProcedure } from '../lib/orpc';
import { logger } from '../lib/pino-logger';
import { generateComparisonSummary } from '../lib/rag-service';
import { generateSystemPrompt } from '../lib/system-prompt';

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

const comparisonInputSchema = z.object({
  question: z.string().min(1, 'Question is required'),
  partyAnswers: z.array(z.any()).describe('Party answers to compare'),
});

// Hardcoded party data based on PDFs in party-program folder
const PARTIES = [
  { id: 'ap', name: 'Arbeiderpartiet', shortName: 'AP', color: '#E5001A' },
  { id: 'frp', name: 'Fremskrittspartiet', shortName: 'FrP', color: '#003C7F' },
  { id: 'h', name: 'Høyre', shortName: 'H', color: '#0065F1' },
  {
    id: 'krf',
    name: 'Kristelig Folkeparti',
    shortName: 'KrF',
    color: '#F9C835',
  },
  {
    id: 'mdg',
    name: 'Miljøpartiet De Grønne',
    shortName: 'MDG',
    color: '#4B9F44',
  },
  { id: 'rodt', name: 'Rødt', shortName: 'Rødt', color: '#D50000' },
  { id: 'sp', name: 'Senterpartiet', shortName: 'SP', color: '#00843D' },
  {
    id: 'sv',
    name: 'Sosialistisk Venstreparti',
    shortName: 'SV',
    color: '#C4002C',
  },
  { id: 'v', name: 'Venstre', shortName: 'V', color: '#006B38' },
] as const;

const openrouter = createOpenRouter({
  apiKey: process.env.OPEN_ROUTER_API_KEY,
});

export const appRouter = {
  healthCheck: publicProcedure.handler(() => {
    return 'OK';
  }),

  // Get available parties for selection
  getParties: publicProcedure.handler(() => {
    return PARTIES;
  }),

  // Generate comparison summary
  compareParties: publicProcedure
    .input(comparisonInputSchema)
    .handler(({ input }) => {
      const { question, partyAnswers } = input;
      return generateComparisonSummary(question, partyAnswers);
    }),

  privateData: protectedProcedure.handler(({ context }) => {
    return {
      message: 'This is private',
      user: context.session?.user,
    };
  }),

  chat: publicProcedure.input(chatInputSchema).handler(async ({ input }) => {
    const { messages, partyId } = input;

    logger.info(
      `Chat endpoint called - partyId: ${partyId}, messagesCount: ${messages.length}`
    );

    try {
      // If no party ID is provided, use the generic chat
      if (!partyId) {
        logger.info('Generic chat mode - no party ID provided');
        const result = streamText({
          model: openrouter('openai/gpt-5-mini'),
          messages: convertToModelMessages(messages),
          system: 'You are a helpful assistant.',
        });
        return streamToEventIterator(result.toUIMessageStream());
      }

      // Find the party information
      const party = PARTIES.find((p) => p.id === partyId);
      if (!party) {
        logger.error(`Party not found: ${partyId}`);
        throw new Error(`Party not found: ${partyId}`);
      }

      logger.info(`Found party: ${party.name} (${party.id})`);

      // Get the user's question from the last message
      const lastMessage = messages.at(-1);
      logger.debug('Processing last message...');

      const userQuestion =
        typeof lastMessage?.content === 'string'
          ? lastMessage.content
          : lastMessage?.content[0]?.text || '';

      if (!userQuestion) {
        logger.error('No question provided in messages');
        throw new Error('No question provided');
      }

      logger.info(
        `Extracted user question (${userQuestion.length} chars): ${userQuestion.substring(0, 100)}${userQuestion.length > 100 ? '...' : ''}`
      );

      // Get relevant content for this party using RAG
      logger.info(
        `Starting RAG search for party ${partyId} with limit ${DEFAULT_CONTENT_LIMIT}`
      );
      const relevantContent = await findRelevantContentByParties(
        userQuestion,
        [partyId],
        DEFAULT_CONTENT_LIMIT,
        DEFAULT_SIMILARITY_THRESHOLD
      );
      logger.info(
        `RAG search completed - found ${relevantContent.length} results`
      );

      // Build context from retrieved content
      let ragContext = '';
      let ragCitations = '';

      if (relevantContent.length === 0) {
        ragContext = `Ingen relevant informasjon funnet i ${party.name}s partiprogram.`;
        logger.warn(
          `No relevant content found for party: ${party.name} (${partyId})`
        );
      } else {
        ragContext = relevantContent
          .map(
            (contentResult) =>
              `Fra ${party.name}s partiprogram${contentResult.chapterTitle ? ` (${contentResult.chapterTitle})` : ''}: ${contentResult.content}`
          )
          .join('\n\n');

        ragCitations = relevantContent
          .map(
            (citationResult, citationIndex) =>
              `[${citationIndex + 1}] ${citationResult.chapterTitle || 'Ukjent kapittel'}${citationResult.pageNumber ? `, side ${citationResult.pageNumber}` : ''}`
          )
          .join('\n');

        logger.info(
          `Built RAG context: ${ragContext.length} chars, ${relevantContent.length} citations`
        );
      }

      // Create system message with party-specific context
      const systemMessage = generateSystemPrompt(
        party.name,
        ragContext,
        ragCitations
      );
      logger.debug(`Generated system prompt: ${systemMessage.length} chars`);

      // Call AI model
      logger.info('Calling OpenRouter AI model (gpt-5-mini)');
      const result = streamText({
        model: openrouter('openai/gpt-5-mini'),
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: userQuestion },
        ],
        temperature: 0.1, // Low temperature for factual responses
        providerOptions: {
          openai: {
            reasoning_effort: 'low',
          },
        },
      });

      logger.info('AI model response initiated, streaming back to client');
      return streamToEventIterator(result.toUIMessageStream());
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      logger.error(
        `Error in chat endpoint: ${errorMessage}${errorStack ? `\nStack: ${errorStack}` : ''}`
      );
      throw error;
    }
  }),
};
export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
