import { json, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { user } from './auth';

export const conversations = pgTable('conversations', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => user.id, { onDelete: 'cascade' }), // optional - for logged in users
  sessionId: text('session_id'), // for anonymous users
  title: text('title').notNull(), // generated or user-defined title
  selectedParties: json('selected_parties').notNull(), // array of party IDs
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const messages = pgTable('messages', {
  id: text('id').primaryKey(),
  conversationId: text('conversation_id')
    .notNull()
    .references(() => conversations.id, { onDelete: 'cascade' }),
  role: text('role').notNull(), // 'user', 'assistant', 'system'
  content: text('content').notNull(),
  citations: json('citations'), // array of citation objects {partyId, pageNumber, chapterTitle, excerpt}
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
