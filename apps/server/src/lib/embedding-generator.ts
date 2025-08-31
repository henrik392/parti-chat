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
    console.log(
      `[RAG] Finding content for party: "${partyShortName}", query: "${query}"`
    );

    const queryEmbedding = await generateSingleEmbedding(query);
    const similarity = sql<number>`1 - (${cosineDistance(embeddings.embedding, queryEmbedding)})`;

    // First check: How many results WITHOUT party filter?
    const allResults = await db
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
      .innerJoin(partyPrograms, eq(embeddings.partyProgramId, partyPrograms.id))
      .innerJoin(parties, eq(partyPrograms.partyId, parties.id))
      .where(gt(similarity, minSimilarity))
      .orderBy(desc(similarity))
      .limit(20);

    console.log(
      `[RAG] Found ${allResults.length} total results without party filter`
    );
    if (allResults.length > 0) {
      console.log(
        '[RAG] Available parties in results:',
        allResults.map((r) => r.partyShortName).slice(0, 10)
      );
      console.log(
        `[RAG] Best match (any party): similarity=${allResults[0]?.similarity}, party="${allResults[0]?.partyShortName}"`
      );
    }

    // Now the filtered results
    const results = await db
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

    console.log(
      `[RAG] Found ${results.length} results with similarity > ${minSimilarity}`
    );

    if (results.length > 0) {
      console.log(
        `[RAG] Best match: similarity=${results[0]?.similarity}, party="${results[0]?.partyShortName}"`
      );
    }

    return results.map((result) => ({
      content: result.content,
      similarity: result.similarity,
      chapterTitle: result.chapterTitle || undefined,
      pageNumber: result.pageNumber || undefined,
    }));
  } catch (error) {
    console.error('[RAG] Error in findRelevantContent:', {
      query,
      partyShortName,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw new Error(
      `RAG search failed for party "${partyShortName}": ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
