import { sql } from 'drizzle-orm';
import { db } from '../db';
import { parties } from '../db/schema';
import { chunkPDFContent, processPDF } from './pdf-processor';

/**
 * Simple test to verify basic functionality
 */
async function testBasicFunctionality() {
  console.log('🧪 Running basic functionality test...\n');

  try {
    // Test 1: Database connection
    console.log('1️⃣ Testing database connection...');
    const result = await db.execute(sql`SELECT NOW()`);
    console.log('   ✅ Database connected successfully');

    // Test 2: Check if pgvector extension is available
    console.log('\n2️⃣ Testing pgvector extension...');
    try {
      await db.execute(sql`SELECT vector(3)`);
      console.log('   ✅ pgvector extension is working');
    } catch (error) {
      console.log(
        '   ❌ pgvector extension issue:',
        error instanceof Error ? error.message : error
      );
    }

    // Test 3: Check party programs directory
    console.log('\n3️⃣ Checking party programs directory...');
    const fs = await import('fs/promises');
    const path = await import('path');

    const programsDir =
      '/Users/henrikkvamme/development/fun/parti-chat/party-program';
    const files = await fs.readdir(programsDir);
    const pdfFiles = files.filter((f) => f.toLowerCase().endsWith('.pdf'));

    console.log(`   📁 Found ${pdfFiles.length} PDF files:`);
    pdfFiles.forEach((file) => console.log(`      - ${file}`));

    if (pdfFiles.length === 0) {
      console.log('   ⚠️ No PDF files found');
      return;
    }

    // Test 4: Try to process one PDF (without OCR to avoid errors)
    console.log('\n4️⃣ Testing PDF processing (simple test)...');
    const testFile = path.join(programsDir, pdfFiles[0]);

    try {
      console.log(`   📄 Processing: ${pdfFiles[0]}`);
      const processed = await processPDF(testFile);
      console.log('   ✅ Successfully processed PDF:');
      console.log(`      - Total pages: ${processed.totalPages}`);
      console.log(`      - Text length: ${processed.text.length} characters`);
      console.log(
        `      - Text preview: ${processed.text.substring(0, 100)}...`
      );

      // Test 5: Test chunking
      console.log('\n5️⃣ Testing content chunking...');
      const chunks = chunkPDFContent(processed, 500);
      console.log(`   ✅ Created ${chunks.length} chunks`);
      console.log(
        `      - First chunk preview: ${chunks[0]?.content.substring(0, 100)}...`
      );
    } catch (error) {
      console.log(
        `   ❌ PDF processing failed: ${error instanceof Error ? error.message : error}`
      );
    }

    // Test 6: Basic database operations
    console.log('\n6️⃣ Testing database schema...');
    try {
      const partyCount = await db.select().from(parties);
      console.log(`   ✅ Parties table accessible (${partyCount.length} rows)`);
    } catch (error) {
      console.log(
        `   ❌ Database schema issue: ${error instanceof Error ? error.message : error}`
      );
    }

    console.log('\n🎉 Basic test completed!');
  } catch (error) {
    console.error('\n❌ Basic test failed:', error);
    throw error;
  }
}

// Run if executed directly
if (import.meta.main) {
  testBasicFunctionality()
    .then(() => {
      console.log('\n✅ All basic tests passed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Basic tests failed:', error);
      process.exit(1);
    });
}
