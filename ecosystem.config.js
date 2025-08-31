const WEB_PORT = 3000;
const SERVER_PORT = 3001;

export const apps = [
  {
    name: 'web-app',
    script: 'web/apps/web/server.js',
    cwd: '/app',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: process.env.WEB_PORT || WEB_PORT,
      NEXT_PUBLIC_SERVER_URL:
        process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3001',
    },
    error_file: '/dev/stderr',
    out_file: '/dev/stdout',
    log_file: '/dev/stdout',
    time: true,
  },
  {
    name: 'api-server',
    script: 'server/apps/server/server.js',
    cwd: '/app',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: process.env.SERVER_PORT || SERVER_PORT,
      // All environment variables from container will be inherited
      DATABASE_URL: process.env.DATABASE_URL,
      OPEN_ROUTER_API_KEY: process.env.OPEN_ROUTER_API_KEY,
      CORS_ORIGIN: process.env.CORS_ORIGIN,
      OPENAI_API_KEY: process.env.OPENAI_API_KEY,
      BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
      BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
    },
    error_file: '/dev/stderr',
    out_file: '/dev/stdout',
    log_file: '/dev/stdout',
    time: true,
  },
];
