import { index, integer, pgTable, text, vector } from 'drizzle-orm/pg-core';
import { partyPrograms } from './party-programs';

export const embeddings = pgTable(
  'embeddings',
  {
    id: text('id').primaryKey(),
    partyProgramId: text('party_program_id')
      .notNull()
      .references(() => partyPrograms.id, { onDelete: 'cascade' }),
    content: text('content').notNull(), // the chunked text
    chapterTitle: text('chapter_title'), // section/chapter name if available
    pageNumber: integer('page_number'), // page reference for citations
    embedding: vector('embedding', { dimensions: 1536 }).notNull(), // OpenAI ada-002 dimensions
    similarity: text('similarity'), // for storing similarity scores during retrieval
  },
  (table) => ({
    // HNSW index for fast similarity search
    embeddingIndex: index('embedding_index').using(
      'hnsw',
      table.embedding.op('vector_cosine_ops')
    ),
    // Additional indexes for filtering
    partyProgramIndex: index('party_program_index').on(table.partyProgramId),
    pageNumberIndex: index('page_number_index').on(table.pageNumber),
  })
);
