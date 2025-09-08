import { integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { parties } from './parties';

export const partyPrograms = pgTable('party_programs', {
  id: text('id').primaryKey(),
  partyId: text('party_id')
    .notNull()
    .references(() => parties.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  year: integer('year').notNull(), // e.g., 2021, 2025
  filePath: text('file_path').notNull(), // path to the PDF file
  pdfUrl: text('pdf_url'), // URL to the original PDF online
  extractedText: text('extracted_text'), // extracted text
  totalPages: integer('total_pages'),
  isProcessed: text('is_processed').notNull().default('pending'), // 'pending', 'processing', 'completed', 'failed'
  processingError: text('processing_error'), // store error if processing fails
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
