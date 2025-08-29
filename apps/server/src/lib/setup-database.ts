import { sql } from 'drizzle-orm';
import { db } from '../db';

/**
 * Set up database with required extensions and initial data
 */
export async function setupDatabase() {
  await db.execute(sql`CREATE EXTENSION IF NOT EXISTS vector;`);
}

// Run setup if this file is executed directly
if (import.meta.main) {
  setupDatabase()
    .then(() => {
      process.exit(0);
    })
    .catch((_error) => {
      process.exit(1);
    });
}
