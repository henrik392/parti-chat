import { openai } from '@ai-sdk/openai';
import { embed, embedMany } from 'ai';
import { and, cosineDistance, desc, eq, gt, sql } from 'drizzle-orm';
import { db } from '../db';
import { embeddings, parties, partyPrograms } from '../db/schema';
import { performanceLogger } from './performance-logger';

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
export async function generateSingleEmbedding(
  text: string,
  requestId?: string
): Promise<number[]> {
  const reqId = requestId || 'unknown';

  try {
    const input = text.replace(/\\n/g, ' ').trim();

    const { result: embedding } = await performanceLogger.timeAsync(
      reqId,
      'openai-embedding-generation',
      async () => {
        const { embedding: embeddingResult } = await embed({
          model: embeddingModel,
          value: input,
        });
        return embeddingResult;
      },
      {
        inputLength: input.length,
        model: 'text-embedding-ada-002',
      }
    );

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
  limit = 8,
  minSimilarity = 0.6,
  requestId?: string
): Promise<RetrievalResult[]> {
  const reqId = requestId || 'unknown';

  try {
    // Time the embedding generation
    const queryEmbedding = await generateSingleEmbedding(query, reqId);

    // Time the database query
    const { result: results } = await performanceLogger.timeAsync(
      reqId,
      'database-similarity-search',
      async () => {
        const similarity = sql<number>`1 - (${cosineDistance(embeddings.embedding, queryEmbedding)})`;

        return await db
          .select({
            content: embeddings.content,
            similarity,
            chapterTitle: embeddings.chapterTitle,
            pageNumber: embeddings.pageNumber,
            partyProgramId: embeddings.partyProgramId,
            programPartyId: partyPrograms.partyId,
            partyShortName: parties.shortName,
          })
          .from(embeddings)
          .innerJoin(
            partyPrograms,
            eq(embeddings.partyProgramId, partyPrograms.id)
          )
          .innerJoin(parties, eq(partyPrograms.partyId, parties.id))
          .where(
            and(
              gt(similarity, minSimilarity),
              sql`lower(${parties.shortName}) = lower(${partyShortName})`
            )
          )
          .orderBy(desc(similarity))
          .limit(limit);
      },
      {
        partyShortName,
        limit,
        minSimilarity,
        queryLength: query.length,
      }
    );

    const mappedResults = results.map((result) => ({
      content: result.content,
      similarity: result.similarity,
      chapterTitle: result.chapterTitle || undefined,
      pageNumber: result.pageNumber || undefined,
    }));

    performanceLogger.logMilestone(reqId, 'rag-search-completed', {
      partyShortName,
      resultsCount: mappedResults.length,
      avgSimilarity:
        mappedResults.length > 0
          ? mappedResults.reduce((sum, r) => sum + r.similarity, 0) /
            mappedResults.length
          : 0,
    });

    return mappedResults;
  } catch (error) {
    throw new Error(
      `RAG search failed for party "${partyShortName}": ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
