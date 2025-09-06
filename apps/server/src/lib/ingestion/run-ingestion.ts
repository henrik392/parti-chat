#!/usr/bin/env bun

import { ingestAllPartyPrograms } from './party-ingestion';

async function runIngestion() {
  try {
    const result = await ingestAllPartyPrograms(
      '/Users/henrikkvamme/development/fun/parti-chat/party-program',
      (progress) => {
        for (const p of progress) {
          const statusEmoji = getStatusEmoji(p.status);

          if (p.error) {
            console.error(
              { party: p.partyShortName, error: p.error },
              `${statusEmoji} Failed to process ${p.partyShortName}`
            );
          } else {
            console.info(
              { party: p.partyShortName, status: p.status },
              `${statusEmoji} ${p.partyShortName}: ${p.message}`
            );
          }
        }
      }
    );

    if (result.failed.length > 0) {
      console.error(
        { failedCount: result.failed.length },
        'Some files failed to process'
      );
      for (const failed of result.failed) {
        console.error(
          { party: failed.party, error: failed.error },
          `Failed: ${failed.party}`
        );
      }
    } else {
      console.info('All files processed successfully');
    }
  } catch (error) {
    console.error({ error }, 'Ingestion process failed');
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
