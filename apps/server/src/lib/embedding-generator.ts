import { openai } from '@ai-sdk/openai';
import { embed, embedMany } from 'ai';
import { and, cosineDistance, desc, eq, gt, sql } from 'drizzle-orm';
import { db } from '../db';
import { embeddings, partyPrograms } from '../db/schema';

const embeddingModel = openai.embedding('text-embedding-ada-002');

export type EmbeddingResult = {
  embedding: number[];
  content: string;
};

export type RetrievalResult = {
  content: string;
  similarity: number;
  chapterTitle?: string;
  pageNumber?: number;
};

/**
 * Generate embeddings for multiple text chunks
 */
export async function generateEmbeddings(
  texts: string[]
): Promise<EmbeddingResult[]> {
  try {
    const { embeddings: embeddingResults } = await embedMany({
      model: embeddingModel,
      values: texts,
    });

    return embeddingResults.map((embedding, i) => ({
      embedding,
      content: texts[i],
    }));
  } catch (error) {
    throw new Error(
      `Failed to generate embeddings: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Generate a single embedding for a query
 */
export async function generateSingleEmbedding(text: string): Promise<number[]> {
  try {
    const input = text.replace(/\\n/g, ' ').trim();
    const { embedding } = await embed({
      model: embeddingModel,
      value: input,
    });

    return embedding;
  } catch (error) {
    throw new Error(
      `Failed to generate embedding: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Find relevant content for a query from a specific party
 */
export async function findRelevantContent(
  query: string,
  partyId: string,
  limit = 5,
  minSimilarity = 0.3
): Promise<RetrievalResult[]> {
  try {
    const queryEmbedding = await generateSingleEmbedding(query);
    const similarity = sql<number>`1 - (${cosineDistance(embeddings.embedding, queryEmbedding)})`;

    const results = await db
      .select({
        content: embeddings.content,
        similarity,
        chapterTitle: embeddings.chapterTitle,
        pageNumber: embeddings.pageNumber,
      })
      .from(embeddings)
      .innerJoin(partyPrograms, eq(embeddings.partyProgramId, partyPrograms.id))
      .where(
        and(gt(similarity, minSimilarity), eq(partyPrograms.partyId, partyId))
      )
      .orderBy(desc(similarity))
      .limit(limit);

    console.log('RAG results:', results);

    return results.map((result) => ({
      content: result.content,
      similarity: result.similarity,
      chapterTitle: result.chapterTitle || undefined,
      pageNumber: result.pageNumber || undefined,
    }));
  } catch {
    throw new Error('RAG search failed');
  }
}
