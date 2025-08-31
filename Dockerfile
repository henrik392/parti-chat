# Use the official Bun image with Node.js
FROM oven/bun:1.2-alpine AS base

# Install PM2 for process management
RUN bun add -g pm2

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy package files for all apps
COPY package.json bun.lockb ./
COPY apps/server/package.json ./apps/server/package.json
COPY apps/web/package.json ./apps/web/package.json

# Install dependencies
RUN bun install --frozen-lockfile

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/server/node_modules ./apps/server/node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules

# Copy source code
COPY . .

# Build both applications
RUN bun run build

# Production image, copy all the files and run both apps
FROM base AS runner
WORKDIR /app

# Create a non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built applications
# Server standalone build
COPY --from=builder /app/apps/server/.next/standalone ./server/
COPY --from=builder /app/apps/server/.next/static ./server/apps/server/.next/static

# Web standalone build
COPY --from=builder /app/apps/web/.next/standalone ./web/
COPY --from=builder /app/apps/web/.next/static ./web/apps/web/.next/static

# Create PM2 ecosystem file
COPY --from=builder /app/ecosystem.config.js ./

# Set ownership
RUN chown -R nextjs:nodejs /app

USER nextjs

# Expose both ports
EXPOSE 3000 3001

# Set environment variables
ENV NODE_ENV=production
ENV WEB_PORT=3000
ENV SERVER_PORT=3001

# Start both applications with PM2
CMD ["pm2-runtime", "start", "ecosystem.config.js"]