import fs from 'fs/promises';
import path from 'path';
import pdf from 'pdf-parse';
import { createWorker } from 'tesseract.js';
import { v4 as uuidv4 } from 'uuid';

export interface ProcessedPDF {
  id: string;
  text: string;
  totalPages: number;
  pages: ProcessedPage[];
}

export interface ProcessedPage {
  pageNumber: number;
  text: string;
  hasText: boolean; // true if PDF has text, false if OCR was needed
}

export interface PDFChunk {
  id: string;
  content: string;
  pageNumber: number;
  chapterTitle?: string;
}

/**
 * Main PDF processing function that handles both text extraction and OCR
 */
export async function processPDF(filePath: string): Promise<ProcessedPDF> {
  try {
    console.log(`Processing PDF: ${filePath}`);

    // First attempt: Extract text directly from PDF
    const pdfBuffer = await fs.readFile(filePath);
    const pdfData = await pdf(pdfBuffer);

    const processedPages: ProcessedPage[] = [];

    // Check if we got meaningful text from direct extraction
    const hasDirectText = pdfData.text.trim().length > 100; // Threshold for meaningful content

    if (hasDirectText) {
      console.log('PDF has extractable text, using direct extraction');

      // For now, we'll treat the entire text as one page since pdf-parse doesn't give us page boundaries
      // In a more advanced implementation, you could use pdf-lib to process page by page
      processedPages.push({
        pageNumber: 1,
        text: pdfData.text,
        hasText: true,
      });
    } else {
      console.log('PDF appears to be scanned, using OCR');

      // If direct text extraction failed, use OCR
      const ocrResults = await performOCR(filePath);
      processedPages.push(...ocrResults);
    }

    return {
      id: uuidv4(),
      text: processedPages.map((p) => p.text).join('\n\n'),
      totalPages: pdfData.numpages,
      pages: processedPages,
    };
  } catch (error) {
    console.error(`Error processing PDF ${filePath}:`, error);
    throw new Error(
      `Failed to process PDF: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Perform OCR on PDF using Tesseract.js
 */
async function performOCR(filePath: string): Promise<ProcessedPage[]> {
  const worker = await createWorker('nor'); // Norwegian language

  try {
    // Configure Tesseract for better Norwegian text recognition
    await worker.setParameters({
      tessedit_char_whitelist:
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzæøåÆØÅ0123456789.,!?;:()[]{}"-\' \n\t',
      tessedit_pageseg_mode: '1', // Automatic page segmentation with OSD
    });

    const {
      data: { text },
    } = await worker.recognize(filePath);

    return [
      {
        pageNumber: 1,
        text: text.trim(),
        hasText: false,
      },
    ];
  } catch (error) {
    console.error('OCR failed:', error);
    throw new Error(
      `OCR processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  } finally {
    await worker.terminate();
  }
}

/**
 * Chunk processed PDF content for embeddings
 * This implements a Norwegian-aware chunking strategy
 */
export function chunkPDFContent(
  processedPDF: ProcessedPDF,
  maxChunkSize = 1000
): PDFChunk[] {
  const chunks: PDFChunk[] = [];

  for (const page of processedPDF.pages) {
    const pageChunks = chunkText(page.text, maxChunkSize);

    pageChunks.forEach((chunkContent, index) => {
      chunks.push({
        id: uuidv4(),
        content: chunkContent,
        pageNumber: page.pageNumber,
        // Try to extract chapter title from the first chunk of significant size
        chapterTitle:
          index === 0 ? extractChapterTitle(chunkContent) : undefined,
      });
    });
  }

  return chunks;
}

/**
 * Smart text chunking that respects Norwegian sentence boundaries
 */
function chunkText(text: string, maxChunkSize: number): string[] {
  const chunks: string[] = [];
  const sentences = text.split(/(?<=[.!?])\s+/);

  let currentChunk = '';

  for (const sentence of sentences) {
    // If adding this sentence would exceed the max size
    if (currentChunk.length + sentence.length > maxChunkSize) {
      if (currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
        currentChunk = sentence;
      } else {
        // If a single sentence is too long, split it by words
        const words = sentence.split(' ');
        let wordChunk = '';

        for (const word of words) {
          if (wordChunk.length + word.length > maxChunkSize) {
            if (wordChunk.length > 0) {
              chunks.push(wordChunk.trim());
              wordChunk = word;
            } else {
              // If a single word is too long, just add it
              chunks.push(word);
            }
          } else {
            wordChunk += (wordChunk ? ' ' : '') + word;
          }
        }

        if (wordChunk.length > 0) {
          currentChunk = wordChunk;
        }
      }
    } else {
      currentChunk += (currentChunk ? ' ' : '') + sentence;
    }
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk.trim());
  }

  return chunks.filter((chunk) => chunk.length > 0);
}

/**
 * Attempt to extract chapter title from content
 * This is a simple heuristic - could be improved with better NLP
 */
function extractChapterTitle(content: string): string | undefined {
  const lines = content
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  // Look for potential headings in the first few lines
  for (let i = 0; i < Math.min(3, lines.length); i++) {
    const line = lines[i];

    // Heuristics for Norwegian headings:
    // - Short lines (likely titles)
    // - Lines that start with numbers (e.g., "1. Innledning")
    // - Lines that are in ALL CAPS
    // - Lines that contain common Norwegian chapter words

    if (
      line.length < 100 &&
      line.length > 5 &&
      (/^\d+\.?\s/.test(line) || // Starts with number
        line === line.toUpperCase() || // All caps
        /^(del|kapittel|avsnitt|innledning|konklusjon|sammendrag)/i.test(line)) // Common Norwegian chapter words
    ) {
      return line;
    }
  }

  return;
}
