import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import type { RouterClient } from '@orpc/server';
import { streamToEventIterator } from '@orpc/server';
import { convertToModelMessages, streamText } from 'ai';
import { z } from 'zod';
import { protectedProcedure, publicProcedure } from '../lib/orpc';

const chatInputSchema = z.object({
  messages: z.array(z.any()).describe('Array of UI messages from the chat'),
});

const openrouter = createOpenRouter({
  apiKey: process.env.OPEN_ROUTER_API_KEY,
});

export const appRouter = {
  healthCheck: publicProcedure.handler(() => {
    return 'OK';
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
