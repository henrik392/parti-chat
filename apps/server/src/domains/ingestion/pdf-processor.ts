import fs from 'node:fs/promises';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';

import { v4 as uuidv4 } from 'uuid';

const MAX_TITLE_LENGTH = 100;
const MIN_TITLE_LENGTH = 5;
const MAX_LINES_TO_CHECK = 3;

// Define regex patterns at module level for performance
const NUMBER_PREFIX_REGEX = /^\d+\.?\s/;
const NORWEGIAN_CHAPTER_WORDS_REGEX =
  /^(del|kapittel|avsnitt|innledning|konklusjon|sammendrag)/i;

export type ProcessedPDF = {
  id: string;
  text: string;
  totalPages: number;
  pages: ProcessedPage[];
};

export type ProcessedPage = {
  pageNumber: number;
  text: string;
  hasText: boolean;
};

export type PDFChunk = {
  id: string;
  content: string;
  pageNumber: number;
  chapterTitle?: string;
};

/**
 * Main PDF processing function using pdfjs-dist
 */
export async function processPDF(filePath: string): Promise<ProcessedPDF> {
  try {
    const pdfBuffer = await fs.readFile(filePath);
    
    // Convert Buffer to Uint8Array for pdfjs-dist
    const pdfData = new Uint8Array(pdfBuffer);
    
    // Load PDF document
    const loadingTask = pdfjs.getDocument({ 
      data: pdfData,
      standardFontDataUrl: 'https://unpkg.com/pdfjs-dist@5.4.149/standard_fonts/'
    });
    const pdfDoc = await loadingTask.promise;
    
    const processedPages: ProcessedPage[] = [];
    let allText = '';

    // Process each page
    for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
      const page = await pdfDoc.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      // Extract text from the page
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ')
        .trim();
      
      processedPages.push({
        pageNumber: pageNum,
        text: pageText,
        hasText: pageText.length > 0,
      });

      if (pageText) {
        allText += pageText + '\n';
      }
    }

    await pdfDoc.destroy();

    return {
      id: uuidv4(),
      text: allText.trim(),
      totalPages: pdfDoc.numPages,
      pages: processedPages,
    };
  } catch (error) {
    throw new Error(
      `Failed to process PDF: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Chunk processed PDF content using LangChain text splitter
 */
export async function chunkPDFContent(
  processedPDF: ProcessedPDF,
  maxChunkSize = 1000,
  chunkOverlap = 200
): Promise<PDFChunk[]> {
  const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: maxChunkSize,
    chunkOverlap,
    separators: ['\n\n', '\n', '. ', '! ', '? ', ' ', ''],
  });

  const chunks: PDFChunk[] = [];

  for (const page of processedPDF.pages) {
    if (page.text.trim().length === 0) {
      continue;
    }

    const pageChunks = await textSplitter.splitText(page.text);

    for (let index = 0; index < pageChunks.length; index++) {
      const chunkContent = pageChunks[index];
      chunks.push({
        id: uuidv4(),
        content: chunkContent.trim(),
        pageNumber: page.pageNumber,
        chapterTitle:
          index === 0 ? extractChapterTitle(chunkContent) : undefined,
      });
    }
  }

  return chunks.filter((chunk) => chunk.content.length > 0);
}

/**
 * Extract chapter title from content using Norwegian-aware heuristics
 */
function extractChapterTitle(content: string): string | undefined {
  const lines = content
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  // Look for potential headings in the first few lines
  for (let i = 0; i < Math.min(MAX_LINES_TO_CHECK, lines.length); i++) {
    const line = lines[i];

    // Heuristics for Norwegian headings:
    // - Short lines (likely titles)
    // - Lines that start with numbers (e.g., "1. Innledning")
    // - Lines that are in ALL CAPS
    // - Lines that contain common Norwegian chapter words

    if (
      line.length < MAX_TITLE_LENGTH &&
      line.length > MIN_TITLE_LENGTH &&
      (NUMBER_PREFIX_REGEX.test(line) || // Starts with number
        line === line.toUpperCase() || // All caps
        NORWEGIAN_CHAPTER_WORDS_REGEX.test(line)) // Common Norwegian chapter words
    ) {
      return line;
    }
  }

  return;
}
