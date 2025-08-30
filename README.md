# Parti-Chat

A multi-party political Q&A chat application that provides neutral, side-by-side answers from Norwegian political parties based on their official party programs.

## Overview

Parti-Chat allows users to:
- **Select multiple parties** and ask policy questions
- **Get grounded answers** based strictly on party programs (PDFs) 
- **Compare positions** with transparent citations and page references
- **View source material** with direct links to PDF pages
- **Save conversation history** locally or with optional account sync

All responses are in Norwegian Bokmål and strictly grounded in official party program documents.

## 🚨 Development Note

**The latest commit contains a temporary `as any` type cast fix in `apps/web/src/utils/orpc.ts`. This should be properly fixed by implementing correct ORPC client types or using a shared types package before production deployment.**

## Tech Stack

- **Frontend**: Next.js 15, React 19, TailwindCSS, shadcn/ui
- **Backend**: Next.js API, oRPC for type-safe APIs
- **Database**: PostgreSQL with pgvector, Drizzle ORM
- **AI**: OpenRouter (GPT-4o-mini) for RAG-based responses
- **Runtime**: Bun
- **Monorepo**: Turborepo

## Quick Start

1. **Install dependencies**:
   ```bash
   bun install
   ```

2. **Set up PostgreSQL database** and update environment variables:
   ```bash
   # apps/server/.env
   DATABASE_URL=postgresql://...
   OPEN_ROUTER_API_KEY=your-key
   BETTER_AUTH_SECRET=your-secret
   ```

3. **Apply database schema**:
   ```bash
   bun run db:push
   ```

4. **Ingest party programs** (place PDFs in `/party-program/`):
   ```bash
   bun run ingest:parties
   ```

5. **Start development servers**:
   ```bash
   bun dev
   ```

   - Web app: http://localhost:3000
   - API server: http://localhost:3001

## Project Structure

```
parti-chat/
├── apps/
│   ├── web/          # Frontend (Next.js)
│   └── server/       # Backend API (oRPC + RAG)
├── party-program/    # PDF storage for party programs
└── docker-compose.yml # Local development setup
```

## Key Features

- **RAG-powered answers** with pgvector similarity search
- **Citation tracking** with page numbers and chapter references
- **Streaming responses** for real-time answer generation  
- **Multi-party comparison** summaries on demand
- **PDF text extraction** with chunking for optimal retrieval
- **Conversation persistence** with optional authentication

## Available Scripts

- `bun dev` - Start all apps in development
- `bun build` - Build for production
- `bun run db:push` - Apply database changes
- `bun run db:studio` - Open database GUI
- `bun run ingest:parties` - Process party program PDFs

## Deployment

The app is designed for deployment on platforms like Dokploy, Railway, or Vercel with separate services for frontend, backend, and PostgreSQL database.

## Contributing

Built with [Better-T-Stack](https://github.com/AmanVarshney01/create-better-t-stack). See [PRD.md](./PRD.md) for detailed product requirements and specifications.