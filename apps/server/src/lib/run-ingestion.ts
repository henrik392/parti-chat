#!/usr/bin/env bun

import logger from './logger';
import { ingestAllPartyPrograms } from './party-ingestion';

async function runIngestion() {
  try {
    const result = await ingestAllPartyPrograms(
      '/Users/henrikkvamme/development/fun/parti-chat/party-program',
      (progress) => {
        for (const p of progress) {
          const statusEmoji = getStatusEmoji(p.status);

          if (p.error) {
            logger.error(
              { file: p.file, error: p.error },
              `${statusEmoji} Failed to process ${p.file}`
            );
          } else {
            logger.info(
              { file: p.file, status: p.status },
              `${statusEmoji} ${p.file}`
            );
          }
        }
      }
    );

    if (result.failed.length > 0) {
      logger.error(
        { failedCount: result.failed.length },
        'Some files failed to process'
      );
      for (const failed of result.failed) {
        logger.error(
          { file: failed.file, error: failed.error },
          `Failed: ${failed.file}`
        );
      }
    } else {
      logger.info('All files processed successfully');
    }
  } catch (error) {
    logger.error({ error }, 'Ingestion process failed');
    process.exit(1);
  }
}

function getStatusEmoji(status: string): string {
  switch (status) {
    case 'completed':
      return '✅';
    case 'processing':
      return '⚡';
    case 'failed':
      return '❌';
    default:
      return '⏳';
  }
}

runIngestion();
