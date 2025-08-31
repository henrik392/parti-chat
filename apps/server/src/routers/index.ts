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

// Constants for RAG
const DEFAULT_CONTENT_LIMIT = 5;
const DEFAULT_SIMILARITY_THRESHOLD = 0.6;
const MAX_STEPS = 5;

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

    // Find the party information if partyShortName is provided
    let party: (typeof PARTIES)[number] | null = null;
    if (partyShortName) {
      party = PARTIES.find((p) => p.shortName === partyShortName) || null;
      if (!party) {
        throw new Error(`Party not found: ${partyShortName}`);
      }
    }

    const result = streamText({
      model: openrouter('openai/gpt-5-mini'),
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
          description: `Hent informasjon fra ${party?.name || 'parti'}programmet for å svare på spørsmål`,
          inputSchema: z.object({
            question: z.string().describe('Brukerens spørsmål'),
          }),
          execute: async ({ question }) => {
            try {
              const relevantContent = await findRelevantContent(
                question,
                partyShortName || '',
                DEFAULT_CONTENT_LIMIT,
                DEFAULT_SIMILARITY_THRESHOLD
              );

              if (relevantContent.length === 0) {
                return `Ingen relevant informasjon funnet i ${party?.name || 'parti'}programmet.`;
              }

              // Format content with citation markers
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
            } catch (_error) {
              return `Feil ved henting av informasjon fra ${party?.name || 'parti'}programmet.`;
            }
          },
        }),
      },
    });

    return streamToEventIterator(result.toUIMessageStream());
  }),
};
export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
