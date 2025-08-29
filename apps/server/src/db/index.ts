import { drizzle } from 'drizzle-orm/node-postgres';
import { account, session, user, verification } from './schema/auth';
import { conversations, messages } from './schema/conversations';
import { embeddings } from './schema/embeddings';
import { parties } from './schema/parties';
import { partyPrograms } from './schema/party-programs';

const schema = {
  user,
  account,
  session,
  verification,
  conversations,
  messages,
  embeddings,
  parties,
  partyPrograms,
};

export const db = drizzle(process.env.DATABASE_URL || '', { schema });
