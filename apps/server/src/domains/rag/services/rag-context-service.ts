import { performanceLogger } from '../../../lib/performance-logger';
import { extractMessageContent } from '../../chat/services/message-service';
import type { Message } from '../../chat/types';
import {
  DECIMAL_PRECISION,
  DEFAULT_CONTENT_LIMIT,
  DEFAULT_SIMILARITY_THRESHOLD,
} from '../constants/thresholds';
import type { FormattedSearchResult, RagContext } from '../types';
import { findRelevantContent } from './embedding-service';
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
