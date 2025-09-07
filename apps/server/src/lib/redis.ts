import { createClient } from 'redis';

let client: ReturnType<typeof createClient> | null = null;

export async function getRedisClient() {
  if (!client) {
    client = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      socket: {
        connectTimeout: 5000,
      },
    });

    client.on('error', (_err) => {
      // Redis errors are handled gracefully
    });

    client.on('connect', () => {
      // Redis connection established
    });

    await client.connect();
  }

  return client;
}

export async function closeRedisConnection() {
  if (client) {
    await client.quit();
    client = null;
  }
}
