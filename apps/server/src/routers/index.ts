import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import type { RouterClient } from '@orpc/server';
import { streamToEventIterator } from '@orpc/server';
import { convertToModelMessages, streamText } from 'ai';
import { z } from 'zod';
import { protectedProcedure, publicProcedure } from '../lib/orpc';
import { generatePartyAnswers, generateComparisonSummary, type PartyAnswer } from '../lib/rag-service';

const chatInputSchema = z.object({
  messages: z.array(z.any()).describe('Array of UI messages from the chat'),
});

const questionInputSchema = z.object({
  question: z.string().min(1, 'Question is required'),
  selectedPartyIds: z.array(z.string()).min(1, 'At least one party must be selected'),
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
  { id: 'krf', name: 'Kristelig Folkeparti', shortName: 'KrF', color: '#F9C835' },
  { id: 'mdg', name: 'Miljøpartiet De Grønne', shortName: 'MDG', color: '#4B9F44' },
  { id: 'rodt', name: 'Rødt', shortName: 'Rødt', color: '#D50000' },
  { id: 'sp', name: 'Senterpartiet', shortName: 'SP', color: '#00843D' },
  { id: 'sv', name: 'Sosialistisk Venstreparti', shortName: 'SV', color: '#C4002C' },
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
  askParties: publicProcedure.input(questionInputSchema).handler(async ({ input }) => {
    const { question, selectedPartyIds } = input;
    
    // Validate party IDs
    const validPartyIds = selectedPartyIds.filter(id => 
      PARTIES.some(party => party.id === id)
    );
    
    if (validPartyIds.length === 0) {
      throw new Error('No valid parties selected');
    }
    
    const answers = await generatePartyAnswers(question, validPartyIds);
    return answers;
  }),
  
  // Generate comparison summary
  compareParties: publicProcedure.input(comparisonInputSchema).handler(({ input }) => {
    const { question, partyAnswers } = input;
    return generateComparisonSummary(question, partyAnswers);
  }),

  privateData: protectedProcedure.handler(({ context }) => {
    return {
      message: 'This is private',
      user: context.session?.user,
    };
  }),
  
  chat: publicProcedure.input(chatInputSchema).handler(({ input }) => {
    const result = streamText({
      model: openrouter('openai/gpt-5-mini'),
      messages: convertToModelMessages(input.messages),
      system: 'You are a helpful assistant.',
    });

    return streamToEventIterator(result.toUIMessageStream());
  }),
};
export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
