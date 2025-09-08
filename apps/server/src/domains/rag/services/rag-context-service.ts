import { performanceLogger } from '../../../lib/performance-logger';
import { extractMessageContent } from '../../chat/services/message-service';
import type { Message } from '../../chat/types';
import { getPartyName } from '../../parties/services/party-service';
import {
  DECIMAL_PRECISION,
  DEFAULT_CONTENT_LIMIT,
  DEFAULT_SIMILARITY_THRESHOLD,
} from '../constants/thresholds';
import type {
  ComparisonRagContext,
  FormattedSearchResult,
  RagContext,
  RetrievalResult,
} from '../types';
import { findRelevantContent } from './embedding-service';
import { getCachedRagResults } from './rag-cache-service';
import { getRelevanceNote } from './relevance-service';

export async function buildRagContext(
  partyName: string | null,
  messages: Message[],
  partyShortName: string | undefined,
  requestId: string
): Promise<RagContext | null> {
  if (!partyName) {
    return null;
  }

  const lastMessage = messages.at(-1);
  const question = lastMessage ? extractMessageContent(lastMessage) : '';

  if (!question) {
    return null;
  }

  performanceLogger.logMilestone(requestId, 'rag-search-started', {
    questionLength: question.length,
    partyShortName: partyShortName || 'unknown',
  });

  const { result: relevantContent } = await performanceLogger.timeAsync(
    requestId,
    'rag-search',
    () =>
      findRelevantContent({
        query: question,
        partyShortName: partyShortName || '',
        limit: DEFAULT_CONTENT_LIMIT,
        minSimilarity: DEFAULT_SIMILARITY_THRESHOLD,
        requestId,
      })
  );

  if (relevantContent.length === 0) {
    performanceLogger.logMilestone(requestId, 'rag-context-no-results', {
      userQuestion: question,
      partyShortName: partyShortName || 'unknown',
      searchThreshold: DEFAULT_SIMILARITY_THRESHOLD,
      reason: 'No results above similarity threshold',
    });
    return null;
  }

  // Format the content with similarity scores for better model evaluation
  const formattedContent: FormattedSearchResult[] = relevantContent.map(
    (result, index) => ({
      id: index + 1,
      content: result.content,
      chapterTitle: result.chapterTitle || 'Ukjent kapittel',
      pageNumber: result.pageNumber,
      similarity:
        Math.round(result.similarity * DECIMAL_PRECISION) / DECIMAL_PRECISION,
      relevanceNote: getRelevanceNote(result.similarity),
    })
  );

  const avgSimilarity =
    Math.round(
      (relevantContent.reduce((sum, r) => sum + r.similarity, 0) /
        relevantContent.length) *
        DECIMAL_PRECISION
    ) / DECIMAL_PRECISION;

  const context: RagContext = {
    partyName,
    resultsCount: relevantContent.length,
    avgSimilarity,
    searchResults: formattedContent,
    userQuestion: question,
  };

  performanceLogger.logMilestone(requestId, 'rag-context-prepared', {
    resultsCount: relevantContent.length,
    avgSimilarity: context.avgSimilarity,
    partyShortName: partyShortName || 'unknown',
  });

  return context;
}

/**
 * Helper function to build RAG context from cached results
 */
function buildRagContextFromResults(
  results: RetrievalResult[],
  partyName: string,
  question: string
): RagContext {
  const formattedContent: FormattedSearchResult[] = results.map(
    (result, index) => ({
      id: index + 1,
      content: result.content,
      chapterTitle: result.chapterTitle || 'Ukjent kapittel',
      pageNumber: result.pageNumber,
      similarity:
        Math.round(result.similarity * DECIMAL_PRECISION) / DECIMAL_PRECISION,
      relevanceNote: getRelevanceNote(result.similarity),
    })
  );

  const avgSimilarity =
    Math.round(
      (results.reduce((sum, r) => sum + r.similarity, 0) / results.length) *
        DECIMAL_PRECISION
    ) / DECIMAL_PRECISION;

  return {
    partyName,
    resultsCount: results.length,
    avgSimilarity,
    searchResults: formattedContent,
    userQuestion: question,
  };
}

/**
 * Helper function to retry cache lookup with exponential backoff
 */
async function retryCacheWithBackoff(
  question: string,
  shortName: string,
  requestId: string
): Promise<RetrievalResult[] | null> {
  let retryAttempts = 0;
  const maxRetries = 3;
  const baseDelayMs = 500;

  while (retryAttempts < maxRetries) {
    const delayMs = baseDelayMs * 2 ** retryAttempts;
    await new Promise((resolve) => setTimeout(resolve, delayMs));

    retryAttempts++;

    const retryResults = await getCachedRagResults({
      query: question,
      partyShortName: shortName,
      limit: DEFAULT_CONTENT_LIMIT,
      minSimilarity: DEFAULT_SIMILARITY_THRESHOLD,
      requestId,
    });

    if (retryResults && retryResults.length > 0) {
      performanceLogger.logMilestone(requestId, 'comparison-cache-hit-retry', {
        partyShortName: shortName,
        retryAttempt: retryAttempts,
        delayMs,
        resultsCount: retryResults.length,
      });
      return retryResults;
    }

    performanceLogger.logMilestone(requestId, 'comparison-cache-retry', {
      partyShortName: shortName,
      retryAttempt: retryAttempts,
      delayMs,
    });
  }

  performanceLogger.logMilestone(requestId, 'comparison-cache-exhausted', {
    partyShortName: shortName,
    totalRetries: retryAttempts,
  });

  return null;
}

/**
 * Helper function to build context for a single party
 */
async function buildSinglePartyContext(
  shortName: string,
  question: string,
  requestId: string
): Promise<{
  partyName: string;
  partyShortName: string;
  ragContext: RagContext | null;
}> {
  const partyName = getPartyName(shortName);
  if (!partyName) {
    performanceLogger.logMilestone(requestId, 'comparison-invalid-party', {
      partyShortName: shortName,
    });
    return {
      partyName: shortName,
      partyShortName: shortName,
      ragContext: null,
    };
  }

  let ragContext: RagContext | null = null;

  try {
    // Try initial cache lookup
    const cachedResults = await getCachedRagResults({
      query: question,
      partyShortName: shortName,
      limit: DEFAULT_CONTENT_LIMIT,
      minSimilarity: DEFAULT_SIMILARITY_THRESHOLD,
      requestId,
    });

    if (cachedResults && cachedResults.length > 0) {
      ragContext = buildRagContextFromResults(
        cachedResults,
        partyName,
        question
      );
      performanceLogger.logMilestone(requestId, 'comparison-cache-hit', {
        partyShortName: shortName,
        resultsCount: cachedResults.length,
      });
    } else {
      // Cache miss - retry with backoff
      performanceLogger.logMilestone(requestId, 'comparison-cache-miss', {
        partyShortName: shortName,
      });

      const retryResults = await retryCacheWithBackoff(
        question,
        shortName,
        requestId
      );

      if (retryResults) {
        ragContext = buildRagContextFromResults(
          retryResults,
          partyName,
          question
        );
      }
    }
  } catch (error) {
    performanceLogger.logMilestone(requestId, 'comparison-party-error', {
      partyShortName: shortName,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  return {
    partyName,
    partyShortName: shortName,
    ragContext,
  };
}

/**
 * Build comparison RAG context by aggregating cached results from multiple parties
 */
export async function buildComparisonRagContext(
  selectedPartyShortNames: string[],
  question: string,
  requestId: string
): Promise<ComparisonRagContext> {
  performanceLogger.logMilestone(requestId, 'comparison-rag-started', {
    partyCount: selectedPartyShortNames.length,
    questionLength: question.length,
    parties: selectedPartyShortNames,
  });

  // Build context for each party concurrently
  const partyContexts = await Promise.all(
    selectedPartyShortNames.map((shortName) =>
      buildSinglePartyContext(shortName, question, requestId)
    )
  );

  const totalResultsCount = partyContexts.reduce(
    (sum, ctx) => sum + (ctx.ragContext?.resultsCount || 0),
    0
  );

  performanceLogger.logMilestone(requestId, 'comparison-rag-completed', {
    partiesWithContent: partyContexts.filter((ctx) => ctx.ragContext !== null)
      .length,
    totalPartiesRequested: selectedPartyShortNames.length,
    totalResultsCount,
  });

  return {
    userQuestion: question,
    partyContexts,
    totalResultsCount,
  };
}
