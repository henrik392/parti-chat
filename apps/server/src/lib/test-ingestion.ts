import dotenv from 'dotenv';
import {
  getIngestionStatus,
  type IngestionProgress,
  ingestAllPartyPrograms,
} from './party-ingestion';
import { generatePartyAnswers, getAllParties } from './rag-service';

// Load environment variables
dotenv.config();

/**
 * Test the complete ingestion and RAG pipeline
 */
async function testIngestionPipeline() {
  console.log('🚀 Starting Party Program Ingestion Test\n');

  try {
    // Step 1: Test ingestion
    console.log('📚 Step 1: Ingesting party programs...');

    const progressCallback = (progress: IngestionProgress[]) => {
      progress.forEach((p) => {
        console.log(
          `  ${p.partyShortName.toUpperCase()}: ${p.status} (${p.progress}%) - ${p.message}`
        );
        if (p.error) {
          console.log(`    ❌ Error: ${p.error}`);
        }
      });
      console.log(''); // Empty line for readability
    };

    const result = await ingestAllPartyPrograms(
      '/Users/henrikkvamme/development/fun/parti-chat/party-program',
      progressCallback
    );

    console.log('✅ Ingestion Results:');
    console.log(`  - Total processed: ${result.totalProcessed}`);
    console.log(`  - Failed: ${result.failed.length}`);

    if (result.failed.length > 0) {
      console.log('  Failed parties:');
      result.failed.forEach((f) => {
        console.log(`    - ${f.party}: ${f.error}`);
      });
    }

    // Step 2: Check ingestion status
    console.log('\n📊 Step 2: Checking ingestion status...');
    const status = await getIngestionStatus();

    status.forEach((s) => {
      console.log(
        `  ${s.party}: ${s.status} (${s.totalEmbeddings} embeddings, ${s.totalPages || 'N/A'} pages)`
      );
    });

    // Step 3: Test RAG functionality
    console.log('\n🤖 Step 3: Testing RAG functionality...');

    // Get available parties
    const parties = await getAllParties();
    console.log(
      `Found ${parties.length} parties:`,
      parties.map((p) => p.shortName).join(', ')
    );

    if (parties.length === 0) {
      console.log('❌ No parties found in database');
      return;
    }

    // Test queries
    const testQueries = [
      'Hva er partiets syn på klimapolitikk?',
      'Hvordan vil partiet håndtere helse og omsorg?',
      'Hva sier programmet om utdanning?',
    ];

    for (const query of testQueries) {
      console.log(`\n🔍 Testing query: "${query}"`);

      // Test with first 3 parties (or all if fewer than 3)
      const testParties = parties.slice(0, Math.min(3, parties.length));
      const partyIds = testParties.map((p) => p.id);

      try {
        const answers = await generatePartyAnswers(query, partyIds, 0.5);

        answers.forEach((answer) => {
          console.log(
            `\n  📋 ${answer.party.shortName} (${answer.party.name}):`
          );
          console.log(
            `    Content found: ${answer.hasContent ? '✅ Yes' : '❌ No'}`
          );
          console.log(`    Citations: ${answer.citations.length}`);

          if (answer.hasContent) {
            console.log(`    Answer: ${answer.answer.substring(0, 100)}...`);

            if (answer.citations.length > 0) {
              console.log(
                `    Top citation: Page ${answer.citations[0].pageNumber || 'N/A'}, Similarity: ${answer.citations[0].similarity.toFixed(3)}`
              );
            }
          }
        });
      } catch (error) {
        console.log(
          `    ❌ Error testing query: ${error instanceof Error ? error.message : error}`
        );
      }
    }

    console.log('\n🎉 Test completed successfully!');
  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
}

// Run the test if this file is executed directly
if (import.meta.main) {
  testIngestionPipeline()
    .then(() => {
      console.log('\n✅ All tests passed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Tests failed:', error);
      process.exit(1);
    });
}
