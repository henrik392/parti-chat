import {
  HIGH_SIMILARITY_THRESHOLD,
  LOW_SIMILARITY_THRESHOLD,
  MEDIUM_SIMILARITY_THRESHOLD,
} from '../constants/thresholds';

/**
 * Get relevance note based on similarity score
 */
export function getRelevanceNote(similarity: number): string {
  if (similarity > HIGH_SIMILARITY_THRESHOLD) {
    return 'Høy relevans';
  }
  if (similarity > MEDIUM_SIMILARITY_THRESHOLD) {
    return 'Middels relevans';
  }
  if (similarity > LOW_SIMILARITY_THRESHOLD) {
    return 'Lav relevans';
  }
  return 'Meget lav relevans';
}
