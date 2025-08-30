FROM oven/bun:1 AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy package files
COPY package.json bun.lock ./
COPY apps/server/package.json ./apps/server/

# Install dependencies
RUN bun install --frozen-lockfile

# Build stage
FROM base AS builder
WORKDIR /app

# Copy node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/server/node_modules ./apps/server/node_modules

# Copy source code
COPY . .

# Build the server application
RUN cd apps/server && bun run build

# Production stage
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder --chown=nextjs:nodejs /app/apps/server/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/server/.next/static ./apps/server/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/server/public ./apps/server/public

# Copy party programs directory if it exists
COPY --from=builder /app/apps/server/party-programs ./apps/server/party-programs

USER nextjs

EXPOSE 3001

ENV PORT=3001
ENV HOSTNAME="0.0.0.0"

CMD ["node", "apps/server/server.js"]