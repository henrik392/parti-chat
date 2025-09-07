export type RetrievalResult = {
  content: string;
  similarity: number;
  chapterTitle?: string;
  pageNumber?: number;
};

export type FormattedSearchResult = {
  id: number;
  content: string;
  chapterTitle: string;
  pageNumber?: number;
  similarity: number;
  relevanceNote: string;
};

export type RagContext = {
  partyName: string;
  resultsCount: number;
  avgSimilarity: number;
  searchResults: FormattedSearchResult[];
  userQuestion: string;
};

export type EmbeddingResult = {
  embedding: number[];
  content: string;
};
