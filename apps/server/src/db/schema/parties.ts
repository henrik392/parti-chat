import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const parties = pgTable('parties', {
  id: text('id').primaryKey(),
  name: text('name').notNull(), // e.g., "Arbeiderpartiet"
  shortName: text('short_name').notNull(), // e.g., "AP"
  color: text('color').notNull(), // hex color for UI
  logoUrl: text('logo_url'), // optional logo URL
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
