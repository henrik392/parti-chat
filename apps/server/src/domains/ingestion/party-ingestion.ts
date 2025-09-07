import { promises as fs } from 'node:fs';
import path from 'node:path';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../db';
import { embeddings, parties, partyPrograms } from '../../db/schema';
import { generateEmbeddings } from '../embedding-generator';
import { chunkPDFContent, processPDF } from './pdf-processor';

// Progress constants
const PROGRESS_FILE_VALIDATED = 20;
const PROGRESS_PROGRAM_READY = 30;
const PROGRESS_PDF_PROCESSED = 50;
const PROGRESS_CHUNKS_CREATED = 70;
const PROGRESS_EMBEDDINGS_GENERATED = 85;
const PROGRESS_EMBEDDINGS_STORED = 95;
const PROGRESS_COMPLETED = 100;

// Progress threshold constants for messages
const PROGRESS_THRESHOLD_PREPARING = 20;
const PROGRESS_THRESHOLD_PDF_PROCESSING = 40;
const PROGRESS_THRESHOLD_CHUNKING = 70;
const PROGRESS_THRESHOLD_EMBEDDING = 90;
const PROGRESS_THRESHOLD_SAVING = 100;

// Norwegian party data - you can expand this
const PARTY_DATA = [
  { shortName: 'ap', name: 'Arbeiderpartiet', color: '#e30613' },
  { shortName: 'frp', name: 'Fremskrittspartiet', color: '#003d82' },
  { shortName: 'h', name: 'Høyre', color: '#0084d1' },
  { shortName: 'krf', name: 'Kristelig Folkeparti', color: '#f4a11e' },
  { shortName: 'mdg', name: 'Miljøpartiet De Grønne', color: '#4a7c24' },
  { shortName: 'r', name: 'Rødt', color: '#d2001f' },
  { shortName: 'sp', name: 'Senterpartiet', color: '#00a950' },
  { shortName: 'sv', name: 'Sosialistisk Venstreparti', color: '#dc143c' },
  { shortName: 'v', name: 'Venstre', color: '#00a651' },
];

export type IngestionProgress = {
  partyShortName: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number; // 0-100
  message: string;
  error?: string;
};

export type IngestionResult = {
  success: boolean;
  totalProcessed: number;
  failed: Array<{ party: string; error: string }>;
  progress: IngestionProgress[];
};

/**
 * Main function to ingest all party programs from the party-program directory
 */
export async function ingestAllPartyPrograms(
  programsDirectory = '/Users/henrikkvamme/development/fun/parti-chat/party-program',
  progressCallback?: (progress: IngestionProgress[]) => void
): Promise<IngestionResult> {
  const result: IngestionResult = {
    success: true,
    totalProcessed: 0,
    failed: [],
    progress: [],
  };

  try {
    // Initialize parties in database
    await initializeParties();

    // Get list of PDF files
    const files = await fs.readdir(programsDirectory);
    const pdfFiles = files.filter((file) =>
      file.toLowerCase().endsWith('.pdf')
    );

    // Initialize progress tracking
    result.progress = pdfFiles.map((file) => ({
      partyShortName: path.parse(file).name.toLowerCase(),
      status: 'pending',
      progress: 0,
      message: 'Waiting to process',
    }));

    // Process each PDF file
    for (let i = 0; i < pdfFiles.length; i++) {
      const file = pdfFiles[i];
      const partyShortName = path.parse(file).name.toLowerCase();
      const filePath = path.join(programsDirectory, file);

      try {
        // Update progress
        result.progress[i].status = 'processing';
        result.progress[i].message = 'Processing PDF...';
        progressCallback?.(result.progress);

        await ingestSinglePartyProgram(partyShortName, filePath, (progress) => {
          result.progress[i].progress = progress;
          result.progress[i].message = getProgressMessage(progress);
          progressCallback?.(result.progress);
        });

        result.progress[i].status = 'completed';
        result.progress[i].progress = PROGRESS_COMPLETED;
        result.progress[i].message = 'Successfully processed';
        result.totalProcessed++;
      } catch (error) {
        result.success = false;
        result.failed.push({
          party: partyShortName,
          error: error instanceof Error ? error.message : 'Unknown error',
        });

        result.progress[i].status = 'failed';
        result.progress[i].error =
          error instanceof Error ? error.message : 'Unknown error';
        result.progress[i].message = 'Processing failed';
      }

      progressCallback?.(result.progress);
    }
    return result;
  } catch (error) {
    result.success = false;
    throw error;
  }
}

/**
 * Process a single party program
 */
async function ingestSinglePartyProgram(
  partyShortName: string,
  filePath: string,
  progressCallback?: (progress: number) => void
): Promise<void> {
  progressCallback?.(10);

  // Get party from database
  const party = await db.query.parties.findFirst({
    where: eq(parties.shortName, partyShortName.toUpperCase()),
  });

  if (!party) {
    throw new Error(`Party not found: ${partyShortName}`);
  }

  progressCallback?.(PROGRESS_FILE_VALIDATED);

  // Check if this program already exists
  const existingProgram = await db.query.partyPrograms.findFirst({
    where: eq(partyPrograms.partyId, party.id),
  });

  if (existingProgram && existingProgram.isProcessed === 'completed') {
    return;
  }

  progressCallback?.(PROGRESS_PROGRAM_READY);

  try {
    const processedPDF = await processPDF(filePath);

    progressCallback?.(PROGRESS_PDF_PROCESSED);

    // Create or update the party program record
    const programId = existingProgram?.id || uuidv4();

    if (existingProgram) {
      await db
        .update(partyPrograms)
        .set({
          extractedText: processedPDF.text,
          totalPages: processedPDF.totalPages,
          isProcessed: 'processing',
          processingError: null,
          updatedAt: new Date(),
        })
        .where(eq(partyPrograms.id, programId));
    } else {
      await db.insert(partyPrograms).values({
        id: programId,
        partyId: party.id,
        title: `${party.name} Partiprogram 2025`, // You might want to extract this from PDF
        year: 2025, // You might want to extract this from filename or PDF
        filePath,
        extractedText: processedPDF.text,
        totalPages: processedPDF.totalPages,
        isProcessed: 'processing',
      });
    }

    progressCallback?.(60);
    const chunks = await chunkPDFContent(processedPDF);

    progressCallback?.(PROGRESS_CHUNKS_CREATED);
    const embeddings_data = await generateEmbeddings(
      chunks.map((c) => c.content)
    );

    progressCallback?.(PROGRESS_EMBEDDINGS_GENERATED);

    // Clear existing embeddings for this program
    await db.delete(embeddings).where(eq(embeddings.partyProgramId, programId));

    // Insert new embeddings
    const embeddingsToInsert = embeddings_data.map((embedding, index) => ({
      id: uuidv4(),
      partyProgramId: programId,
      content: chunks[index].content,
      chapterTitle: chunks[index].chapterTitle,
      pageNumber: chunks[index].pageNumber,
      embedding: embedding.embedding,
    }));

    await db.insert(embeddings).values(embeddingsToInsert);

    progressCallback?.(PROGRESS_EMBEDDINGS_STORED);

    // Mark as completed
    await db
      .update(partyPrograms)
      .set({
        isProcessed: 'completed',
        updatedAt: new Date(),
      })
      .where(eq(partyPrograms.id, programId));

    progressCallback?.(PROGRESS_COMPLETED);
  } catch (error) {
    // Mark as failed
    if (existingProgram?.id) {
      await db
        .update(partyPrograms)
        .set({
          isProcessed: 'failed',
          processingError:
            error instanceof Error ? error.message : 'Unknown error',
          updatedAt: new Date(),
        })
        .where(eq(partyPrograms.id, existingProgram.id));
    }

    throw error;
  }
}

/**
 * Initialize parties in the database
 */
async function initializeParties(): Promise<void> {
  for (const partyData of PARTY_DATA) {
    const existing = await db.query.parties.findFirst({
      where: eq(parties.shortName, partyData.shortName.toUpperCase()),
    });

    if (!existing) {
      await db.insert(parties).values({
        id: uuidv4(),
        name: partyData.name,
        shortName: partyData.shortName.toUpperCase(),
        color: partyData.color,
      });
    }
  }
}

/**
 * Get human-readable progress message
 */
function getProgressMessage(progress: number): string {
  if (progress < PROGRESS_THRESHOLD_PREPARING) {
    return 'Preparing...';
  }
  if (progress < PROGRESS_THRESHOLD_PDF_PROCESSING) {
    return 'Processing PDF...';
  }
  if (progress < PROGRESS_THRESHOLD_CHUNKING) {
    return 'Chunking content...';
  }
  if (progress < PROGRESS_THRESHOLD_EMBEDDING) {
    return 'Generating embeddings...';
  }
  if (progress < PROGRESS_THRESHOLD_SAVING) {
    return 'Saving to database...';
  }
  return 'Completed';
}

/**
 * Get ingestion status for all parties
 */
export async function getIngestionStatus(): Promise<
  Array<{
    party: string;
    status: string;
    totalPages?: number;
    totalEmbeddings: number;
    lastProcessed?: Date;
  }>
> {
  const programs = await db.select().from(partyPrograms);

  const result: Array<{
    party: string;
    status: string;
    totalPages?: number;
    totalEmbeddings: number;
    lastProcessed?: Date;
  }> = [];

  for (const program of programs) {
    // Get the party information
    const party = await db
      .select()
      .from(parties)
      .where(eq(parties.id, program.partyId))
      .limit(1);

    const embeddingCount = await db
      .select()
      .from(embeddings)
      .where(eq(embeddings.partyProgramId, program.id));

    result.push({
      party: party[0]?.name || 'Unknown',
      status: program.isProcessed,
      totalPages: program.totalPages || undefined,
      totalEmbeddings: embeddingCount.length,
      lastProcessed: program.updatedAt,
    });
  }

  return result;
}
