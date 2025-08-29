import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import type { RouterClient } from '@orpc/server';
import { streamToEventIterator } from '@orpc/server';
import { convertToModelMessages, streamText } from 'ai';
import { z } from 'zod';
import { findRelevantContentByParties } from '../lib/embedding-generator';
import { protectedProcedure, publicProcedure } from '../lib/orpc';
import {
  generateComparisonSummary,
  generatePartyAnswers,
} from '../lib/rag-service';

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

const questionInputSchema = z.object({
  question: z.string().min(1, 'Question is required'),
  selectedPartyIds: z
    .array(z.string())
    .min(1, 'At least one party must be selected'),
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

  // Ask question to selected parties
  askParties: publicProcedure
    .input(questionInputSchema)
    .handler(async ({ input }) => {
      const { question, selectedPartyIds } = input;

      // Validate party IDs
      const validPartyIds = selectedPartyIds.filter((id) =>
        PARTIES.some((party) => party.id === id)
      );

      if (validPartyIds.length === 0) {
        throw new Error('No valid parties selected');
      }

      const answers = await generatePartyAnswers(question, validPartyIds);
      return answers;
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

    // If no party ID is provided, use the generic chat
    if (!partyId) {
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

    // Get relevant content for this party using RAG
    const relevantContent = await findRelevantContentByParties(
      userQuestion,
      [partyId],
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
    }

    // Create system message with party-specific context
    const systemMessage = `Du er en ekspert på norsk politikk som svarer på vegne av ${party.name} (${party.shortName}).

Basér ditt svar UTELUKKENDE på følgende informasjon fra partiets offisielle program:

${ragContext}

Regler for svaret:
1. Svar på norsk bokmål
2. Hold svaret til 3-6 setninger
3. Kun bruk informasjon fra konteksten over
4. Hvis spørsmålet ikke dekkes av konteksten, svar: "Ikke omtalt i partiprogrammet (${new Date().getFullYear()})."
5. Ikke spekuler eller legg til egen tolkning
6. Vær nøytral og faktaorientert

Kilder som kan refereres til:
${ragCitations}`;

    const result = streamText({
      model: openrouter('openai/gpt-5-mini'),
      messages: [
        { role: 'system', content: systemMessage },
        { role: 'user', content: userQuestion },
      ],
      temperature: 0.1, // Low temperature for factual responses
    });

    return streamToEventIterator(result.toUIMessageStream());
  }),
};
export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
