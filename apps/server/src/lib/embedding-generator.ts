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
  partyName: string;
  partyShortName: string;
  chapterTitle?: string;
  pageNumber?: number;
  partyColor: string;
};

/**
 * Generate embeddings for multiple text chunks
 */
export async function generateEmbeddings(
  texts: string[]
): Promise<EmbeddingResult[]> {
  try {
    const { embeddings } = await embedMany({
      model: embeddingModel,
      values: texts,
    });

    return embeddings.map((embedding, i) => ({
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
 * Find relevant content for a query from specific parties
 */
export async function findRelevantContentByParties(
  query: string,
  partyIds: string[],
  limit = 5,
  minSimilarity = 0.7
): Promise<RetrievalResult[]> {
  try {
    // Generate embedding for the query
    const queryEmbedding = await generateSingleEmbedding(query);

    // Calculate cosine similarity
    const similarity = sql<number>`1 - (${cosineDistance(embeddings.embedding, queryEmbedding)})`;

    // Query database for relevant content
    const results = await db
      .select({
        content: embeddings.content,
        similarity,
        partyName: parties.name,
        partyShortName: parties.shortName,
        chapterTitle: embeddings.chapterTitle,
        pageNumber: embeddings.pageNumber,
        partyColor: parties.color,
        partyId: parties.id,
      })
      .from(embeddings)
      .innerJoin(partyPrograms, eq(embeddings.partyProgramId, partyPrograms.id))
      .innerJoin(parties, eq(partyPrograms.partyId, parties.id))
      .where(
        and(
          gt(similarity, minSimilarity),
          sql`${parties.id} = ANY(${partyIds})`
        )
      )
      .orderBy(desc(similarity))
      .limit(limit);

    return results.map((result) => ({
      content: result.content,
      similarity: result.similarity,
      partyName: result.partyName,
      partyShortName: result.partyShortName,
      chapterTitle: result.chapterTitle || undefined,
      pageNumber: result.pageNumber || undefined,
      partyColor: result.partyColor,
    }));
  } catch (error) {
    throw new Error(
      `Failed to find relevant content: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Find relevant content for a query from all parties, grouped by party
 */
export async function findRelevantContentAllParties(
  query: string,
  resultsPerParty = 3,
  minSimilarity = 0.6
): Promise<{ [partyId: string]: RetrievalResult[] }> {
  try {
    // Generate embedding for the query
    const queryEmbedding = await generateSingleEmbedding(query);

    // Calculate cosine similarity
    const similarity = sql<number>`1 - (${cosineDistance(embeddings.embedding, queryEmbedding)})`;

    // Get all parties
    const allParties = await db.select().from(parties);

    const resultsByParty: { [partyId: string]: RetrievalResult[] } = {};

    // Query each party separately to ensure we get results from each
    for (const party of allParties) {
      const partyResults = await db
        .select({
          content: embeddings.content,
          similarity,
          partyName: parties.name,
          partyShortName: parties.shortName,
          chapterTitle: embeddings.chapterTitle,
          pageNumber: embeddings.pageNumber,
          partyColor: parties.color,
        })
        .from(embeddings)
        .innerJoin(
          partyPrograms,
          eq(embeddings.partyProgramId, partyPrograms.id)
        )
        .innerJoin(parties, eq(partyPrograms.partyId, parties.id))
        .where(and(eq(parties.id, party.id), gt(similarity, minSimilarity)))
        .orderBy(desc(similarity))
        .limit(resultsPerParty);

      resultsByParty[party.id] = partyResults.map((result) => ({
        content: result.content,
        similarity: result.similarity,
        partyName: result.partyName,
        partyShortName: result.partyShortName,
        chapterTitle: result.chapterTitle || undefined,
        pageNumber: result.pageNumber || undefined,
        partyColor: result.partyColor,
      }));
    }

    return resultsByParty;
  } catch (error) {
    throw new Error(
      `Failed to find relevant content: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Get similar content within the same party program (for finding related sections)
 */
export async function findSimilarContentInProgram(
  partyProgramId: string,
  referenceContent: string,
  limit = 3,
  minSimilarity = 0.8
): Promise<RetrievalResult[]> {
  try {
    const queryEmbedding = await generateSingleEmbedding(referenceContent);
    const similarity = sql<number>`1 - (${cosineDistance(embeddings.embedding, queryEmbedding)})`;

    const results = await db
      .select({
        content: embeddings.content,
        similarity,
        partyName: parties.name,
        partyShortName: parties.shortName,
        chapterTitle: embeddings.chapterTitle,
        pageNumber: embeddings.pageNumber,
        partyColor: parties.color,
      })
      .from(embeddings)
      .innerJoin(partyPrograms, eq(embeddings.partyProgramId, partyPrograms.id))
      .innerJoin(parties, eq(partyPrograms.partyId, parties.id))
      .where(
        and(
          eq(embeddings.partyProgramId, partyProgramId),
          gt(similarity, minSimilarity),
          sql`${embeddings.content} != ${referenceContent}` // Exclude the reference content itself
        )
      )
      .orderBy(desc(similarity))
      .limit(limit);

    return results.map((result) => ({
      content: result.content,
      similarity: result.similarity,
      partyName: result.partyName,
      partyShortName: result.partyShortName,
      chapterTitle: result.chapterTitle || undefined,
      pageNumber: result.pageNumber || undefined,
      partyColor: result.partyColor,
    }));
  } catch (error) {
    throw new Error(
      `Failed to find similar content: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
