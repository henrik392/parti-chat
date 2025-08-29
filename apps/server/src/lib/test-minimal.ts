import { sql } from 'drizzle-orm';
import { db } from '../db';
import { parties } from '../db/schema';

/**
 * Minimal test to verify database and basic setup
 */
async function testMinimal() {
  console.log('🔧 Running minimal setup test...\n');

  try {
    // Test 1: Database connection
    console.log('1️⃣ Testing database connection...');
    const result = await db.execute(sql`SELECT NOW() as current_time`);
    console.log('   ✅ Database connected successfully');
    console.log('   📅 Current time:', result.rows[0]);

    // Test 2: Check if pgvector extension is available
    console.log('\n2️⃣ Testing pgvector extension...');
    try {
      await db.execute(sql`SELECT vector(3) as test_vector`);
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

    const programsDir =
      '/Users/henrikkvamme/development/fun/parti-chat/party-program';
    try {
      const files = await fs.readdir(programsDir);
      const pdfFiles = files.filter((f) => f.toLowerCase().endsWith('.pdf'));

      console.log(`   📁 Found ${pdfFiles.length} PDF files:`);
      pdfFiles.forEach((file) => console.log(`      - ${file}`));

      if (pdfFiles.length === 0) {
        console.log('   ⚠️ No PDF files found');
      }
    } catch (error) {
      console.log(
        `   ❌ Cannot access directory: ${error instanceof Error ? error.message : error}`
      );
    }

    // Test 4: Test database schema
    console.log('\n4️⃣ Testing database schema...');
    try {
      const partyCount = await db.select().from(parties);
      console.log(`   ✅ Parties table accessible (${partyCount.length} rows)`);

      // Show existing parties if any
      if (partyCount.length > 0) {
        console.log('   📋 Existing parties:');
        partyCount.forEach((party) => {
          console.log(`      - ${party.shortName}: ${party.name}`);
        });
      }
    } catch (error) {
      console.log(
        `   ❌ Database schema issue: ${error instanceof Error ? error.message : error}`
      );
    }

    // Test 5: Test AI SDK import (without actually using it)
    console.log('\n5️⃣ Testing AI SDK availability...');
    try {
      const { embed } = await import('ai');
      console.log('   ✅ AI SDK imported successfully');
    } catch (error) {
      console.log(
        `   ❌ AI SDK import issue: ${error instanceof Error ? error.message : error}`
      );
    }

    console.log('\n🎉 Minimal test completed successfully!');
    console.log('\n💡 Next steps:');
    console.log('   1. Set up your OpenAI API key in .env file');
    console.log('   2. Run the full ingestion test once API key is configured');
    console.log('   3. Verify that party programs are processing correctly');
  } catch (error) {
    console.error('\n❌ Minimal test failed:', error);
    throw error;
  }
}

// Run if executed directly
if (import.meta.main) {
  testMinimal()
    .then(() => {
      console.log('\n✅ Minimal test passed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Minimal test failed:', error);
      process.exit(1);
    });
}
