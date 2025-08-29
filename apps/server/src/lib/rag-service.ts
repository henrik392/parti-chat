import { inArray } from 'drizzle-orm';
import { db } from '../db';
import { parties } from '../db/schema';
import {
  findRelevantContentByParties,
  type RetrievalResult,
} from './embedding-generator';

export type PartyInfo = {
  id: string;
  name: string;
  shortName: string;
  color: string;
};

export type PartyAnswer = {
  party: PartyInfo;
  answer: string;
  citations: Citation[];
  hasContent: boolean;
};

export type Citation = {
  content: string;
  chapterTitle?: string;
  pageNumber?: number;
  similarity: number;
};

export type ComparisonSummary = {
  similarities: string[];
  differences: string[];
  citations: Array<{
    point: string;
    supportingParties: PartyInfo[];
    citation: Citation;
  }>;
};

/**
 * Generate answers for selected parties based on a user query
 */
export async function generatePartyAnswers(
  query: string,
  selectedPartyIds: string[],
  minSimilarity = 0.6
): Promise<PartyAnswer[]> {
  try {
    // Get party information
    const partyInfos = await db
      .select()
      .from(parties)
      .where(inArray(parties.id, selectedPartyIds));

    const answers: PartyAnswer[] = [];

    // Get relevant content for each party
    for (const party of partyInfos) {
      const relevantContent = await findRelevantContentByParties(
        query,
        [party.id],
        5,
        minSimilarity
      );

      const hasContent = relevantContent.length > 0;

      const citations: Citation[] = relevantContent.map((result) => ({
        content: result.content,
        chapterTitle: result.chapterTitle,
        pageNumber: result.pageNumber,
        similarity: result.similarity,
      }));

      // Generate contextual answer based on found content
      const answer = hasContent
        ? generateContextualAnswer(query, relevantContent, party.name)
        : `Ikke omtalt i partiprogrammet (${new Date().getFullYear()}).`;

      answers.push({
        party: {
          id: party.id,
          name: party.name,
          shortName: party.shortName,
          color: party.color,
        },
        answer,
        citations,
        hasContent,
      });
    }

    return answers;
  } catch (error) {
    throw new Error(
      `Failed to generate answers: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Generate contextual answer based on retrieved content
 */
function generateContextualAnswer(
  query: string,
  results: RetrievalResult[],
  _partyName: string
): string {
  if (results.length === 0) {
    return `Ikke omtalt i partiprogrammet (${new Date().getFullYear()}).`;
  }

  // Sort by similarity and take the most relevant content
  const sortedResults = results.sort((a, b) => b.similarity - a.similarity);
  const topResults = sortedResults.slice(0, 3);

  // Create a comprehensive answer based on the top results
  const contextParts = topResults.map((result, _index) => {
    let part = result.content;

    // Add context about the source if available
    if (result.chapterTitle) {
      part = `Fra "${result.chapterTitle}": ${part}`;
    }

    return part;
  });

  // Combine and summarize the content
  const combinedContext = contextParts.join(' ');

  // Create a Norwegian-style answer that's grounded in the content
  // This is a simplified version - in production you might want to use an LLM to generate this
  return createNorwegianAnswer(combinedContext, query);
}

/**
 * Create a Norwegian answer based on the context
 * This is a simplified implementation - in production you'd use an LLM
 */
function createNorwegianAnswer(context: string, _query: string): string {
  // This is a very basic implementation
  // In practice, you would use the AI SDK to generate a proper answer
  const sentences = context.split('.').filter((s) => s.trim().length > 0);
  const relevantSentences = sentences.slice(0, 3);

  return `${relevantSentences.join('. ')}.`;
}

/**
 * Generate a comparison summary between different party positions
 */
export async function generateComparisonSummary(
  _query: string,
  partyAnswers: PartyAnswer[]
): Promise<ComparisonSummary> {
  try {
    const answersWithContent = partyAnswers.filter(
      (answer) => answer.hasContent
    );

    if (answersWithContent.length < 2) {
      return {
        similarities: [
          'For få partier har relevant innhold for sammenligning.',
        ],
        differences: [],
        citations: [],
      };
    }

    // This is a simplified implementation
    // In production, you would use an LLM to analyze and compare the content
    const similarities = findSimilarities(answersWithContent);
    const differences = findDifferences(answersWithContent);
    const citations = extractComparativeCitations(answersWithContent);

    return {
      similarities,
      differences,
      citations,
    };
  } catch (error) {
    throw new Error(
      `Failed to generate comparison: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Find similarities between party positions (simplified implementation)
 */
function findSimilarities(answers: PartyAnswer[]): string[] {
  // This is a very basic implementation
  // In production, you would use semantic analysis or an LLM

  const similarities: string[] = [];
  const keywordCounts: { [key: string]: string[] } = {};

  // Extract keywords from each answer
  answers.forEach((answer) => {
    const words = answer.answer
      .toLowerCase()
      .split(/\s+/)
      .filter((word) => word.length > 4) // Only meaningful words
      .filter((word) => !['ikke', 'omtalt', 'partiprogrammet'].includes(word));

    words.forEach((word) => {
      if (!keywordCounts[word]) {
        keywordCounts[word] = [];
      }
      keywordCounts[word].push(answer.party.shortName);
    });
  });

  // Find common keywords
  Object.entries(keywordCounts).forEach(([keyword, partiesWithKeyword]) => {
    if (partiesWithKeyword.length > 1) {
      similarities.push(
        `${partiesWithKeyword.join(', ')} har lignende fokus på ${keyword}`
      );
    }
  });

  if (similarities.length === 0) {
    similarities.push('Ingen tydelige likheter funnet i programmene.');
  }

  return similarities.slice(0, 3); // Limit to top 3
}

/**
 * Find differences between party positions (simplified implementation)
 */
function findDifferences(answers: PartyAnswer[]): string[] {
  // This is a very basic implementation
  // In production, you would use semantic analysis or an LLM

  const differences: string[] = [];

  // Simple approach: compare answer lengths and some keywords
  answers.forEach((answer, index) => {
    const otherAnswers = answers.filter((_, i) => i !== index);

    // Check for unique keywords in this answer
    const thisWords = new Set(answer.answer.toLowerCase().split(/\s+/));
    const otherWords = new Set(
      otherAnswers.flatMap((a) => a.answer.toLowerCase().split(/\s+/))
    );

    const uniqueWords = Array.from(thisWords).filter(
      (word) => !otherWords.has(word) && word.length > 4
    );

    if (uniqueWords.length > 0) {
      differences.push(
        `${answer.party.shortName} skiller seg ut ved å fokusere på ${uniqueWords.slice(0, 2).join(', ')}`
      );
    }
  });

  if (differences.length === 0) {
    differences.push('Ingen markante forskjeller identifisert.');
  }

  return differences.slice(0, 3); // Limit to top 3
}

/**
 * Extract comparative citations
 */
function extractComparativeCitations(answers: PartyAnswer[]): Array<{
  point: string;
  supportingParties: PartyInfo[];
  citation: Citation;
}> {
  const citations: Array<{
    point: string;
    supportingParties: PartyInfo[];
    citation: Citation;
  }> = [];

  // Group similar citations
  answers.forEach((answer) => {
    if (answer.citations.length > 0) {
      const topCitation = answer.citations[0]; // Most relevant citation

      citations.push({
        point: `${topCitation.content.substring(0, 100)}...`, // Truncate for display
        supportingParties: [answer.party],
        citation: topCitation,
      });
    }
  });

  return citations.slice(0, 5); // Limit to top 5
}

/**
 * Get all available parties
 */
export async function getAllParties(): Promise<PartyInfo[]> {
  try {
    const partyList = await db.select().from(parties);

    return partyList.map((party) => ({
      id: party.id,
      name: party.name,
      shortName: party.shortName,
      color: party.color,
    }));
  } catch (error) {
    throw new Error(
      `Failed to get parties: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Search content across all parties for administration/debugging
 */
export async function searchAllContent(
  query: string,
  limit = 10
): Promise<RetrievalResult[]> {
  try {
    // Get all party IDs
    const allParties = await db.select({ id: parties.id }).from(parties);
    const partyIds = allParties.map((p) => p.id);

    return await findRelevantContentByParties(query, partyIds, limit, 0.5);
  } catch (error) {
    throw new Error(
      `Failed to search content: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
