import { sql } from 'drizzle-orm';
import { db } from '../db';

/**
 * Set up database with required extensions and initial data
 */
export async function setupDatabase() {
  try {
    console.log('Setting up database...');

    // Enable pgvector extension
    console.log('Enabling pgvector extension...');
    await db.execute(sql`CREATE EXTENSION IF NOT EXISTS vector;`);

    console.log('Database setup completed successfully!');
  } catch (error) {
    console.error('Error setting up database:', error);
    throw error;
  }
}

// Run setup if this file is executed directly
if (import.meta.main) {
  setupDatabase()
    .then(() => {
      console.log('Database setup complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Database setup failed:', error);
      process.exit(1);
    });
}
