import type { RouterClient } from '@orpc/server';
import { publicProcedure } from '../lib/orpc';
import { chatRouter } from './chat';
import { partiesRouter } from './parties';

export const appRouter = {
  healthCheck: publicProcedure.handler(() => {
    return 'OK';
  }),
  ...chatRouter,
  ...partiesRouter,
};

export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
