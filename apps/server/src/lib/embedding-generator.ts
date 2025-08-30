import { openai } from '@ai-sdk/openai';
import { embed, embedMany } from 'ai';
import { and, cosineDistance, desc, eq, gt, sql } from 'drizzle-orm';
import { db } from '../db';
import { embeddings, parties, partyPrograms } from '../db/schema';

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
  partyShortName: string,
  limit = 5,
  minSimilarity = 0.3
): Promise<RetrievalResult[]> {
  try {
    const queryEmbedding = await generateSingleEmbedding(query);
    const similarity = sql<number>`1 - (${cosineDistance(embeddings.embedding, queryEmbedding)})`;

    // First, let's see what party programs exist in the database
    const _allPartyPrograms = await db
      .select({
        id: partyPrograms.id,
        partyId: partyPrograms.partyId,
        title: partyPrograms.title,
      })
      .from(partyPrograms);

    // Check if the specific party program exists by joining with parties table
    const _specificPartyProgram = await db
      .select({
        id: partyPrograms.id,
        partyId: partyPrograms.partyId,
        title: partyPrograms.title,
      })
      .from(partyPrograms)
      .innerJoin(parties, eq(partyPrograms.partyId, parties.id))
      .where(eq(parties.shortName, partyShortName));

    const results = await db
      .select({
        content: embeddings.content,
        similarity,
        chapterTitle: embeddings.chapterTitle,
        pageNumber: embeddings.pageNumber,
        partyProgramId: embeddings.partyProgramId,
        programPartyId: partyPrograms.partyId,
      })
      .from(embeddings)
      .innerJoin(partyPrograms, eq(embeddings.partyProgramId, partyPrograms.id))
      .innerJoin(parties, eq(partyPrograms.partyId, parties.id))
      .where(
        and(
          gt(similarity, minSimilarity),
          sql`lower(${parties.shortName}) = lower(${partyShortName})`
        )
      )
      .orderBy(desc(similarity))
      .limit(limit);

    // Let's also try without the party filter to see what we get
    const _resultsWithoutPartyFilter = await db
      .select({
        content: embeddings.content,
        similarity,
        chapterTitle: embeddings.chapterTitle,
        pageNumber: embeddings.pageNumber,
        partyProgramId: embeddings.partyProgramId,
        programPartyId: partyPrograms.partyId,
      })
      .from(embeddings)
      .innerJoin(partyPrograms, eq(embeddings.partyProgramId, partyPrograms.id))
      .where(gt(similarity, minSimilarity))
      .orderBy(desc(similarity))
      .limit(limit);

    return results.map((result) => ({
      content: result.content,
      similarity: result.similarity,
      chapterTitle: result.chapterTitle || undefined,
      pageNumber: result.pageNumber || undefined,
    }));
  } catch (_error) {
    throw new Error('RAG search failed');
  }
}
