# PRD: Multi‑Party Political Chatbot (Norway) with RAG

Owner: You  
Doc version: 1.0  
Target dev language: English (UI copy in Norwegian)  
Environment: Next.js (Bun), orpc, Postgres + pgvector, Drizzle ORM

## 1. Product Summary

Build a public web app where users can ask a political question and receive
side‑by‑side answers “from” selected Norwegian parties. Each party’s answer is
grounded strictly in its latest party program (PDF) via RAG, with transparent
citations to chapters/pages. Optional “Compare summary” condenses differences
and similarities.

- Audience: Public (no login required)
- Optional login: Save and revisit conversation history
- Language: Norsk bokmål UI; PRD and code in English
- Parties: Norwegian national parties (e.g., Høyre, Arbeiderpartiet, FrP, SV,
  Sp, Venstre, KrF, MDG, Rødt, INP). Configurable.

Primary value:
- Trust and transparency: party‑specific, source‑grounded answers with citations
- Comparison: consistent side‑by‑side views and optional comparison summary

Non‑goals:
- Not an official party spokesperson
- No broader sources than party programs at launch
- No real‑time news aggregation

Success metrics (initial):
- p95 time‑to‑first‑token < 2.5s per party reply (with streaming)
- ≥ 95% answers include at least one valid citation (page/chapter)
- ≤ 2% known hallucinations in evaluation set
- ≥ 60% of users engage with at least one source expansion (“Vis utdrag”)

## 2. Key Features

- Party selector in chat bar (toggle buttons). User chooses 2–5 parties.
- Side‑by‑side answers: one card per party with logo/color and citations.
- “Compare summary” button: optional synthesized comparison with citations.
- Citations: show chapter/page and expandable snippet, link to the exact PDF
  location (open at page if possible).
- Conversation history:
  - Anonymous usage: transient session history in local storage
  - Logged‑in users: history stored in DB; can rename and revisit threads
- Transparency & guardrails:
  - Answers constrained to retrieved excerpts (“answer‑from‑sources”)
  - If not covered in the program, answer: “Ikke omtalt i partiprogrammet (år)”

## 3. Requirements

### Functional

- Upload/ingest latest party program PDF per party (admin utility)
- OCR for scanned PDFs; preserve page numbers and headings
- Chunking with overlap; store embeddings in Postgres (pgvector)
- Hybrid retrieval: Postgres full‑text + vector search; ML rerank (optional)
- Party‑scoped retrieval: filter by party and prefer the newest version
- Per question:
  - For each selected party: retrieve top‑k chunks, rerank, construct answer
  - Include citations with chapter/page/year and link to PDF
- Optional compare summary across selected parties
- Streaming responses
- Optional auth to save conversations

### Non‑Functional

- Performance: p95 < 2.5s time‑to‑first‑token per party; total render < 6s for 3
  parties (streamed)
- Cost: default to `openai/gpt-5-mini` via OpenRouter; minimize tokens and k
- Reliability: graceful degradation when one party fails (others still show)
- Observability: basic logs for retrieval, chosen chunks, token usage
- Privacy: small project; minimal PII storage; simple disclaimer

## 4. Tech Stack

- Frontend: Next.js (App Router), React, Tailwind (optional), streaming UI cards
- Backend: Next.js route handlers + orpc
- Runtime: Bun
- DB: Postgres (Docker), pgvector, Drizzle ORM
- RAG:
  - Embeddings:
    - Option A (hosted, simple): OpenAI `text-embedding-3-large`
    - Option B (self‑host): BGE‑M3 (multilingual) or Qwen‑Embedding‑4B
  - Reranker (self‑host): BAAI `bge-reranker-v2-m3` (optional but recommended)
  - Hybrid retrieval: Postgres full‑text (tsvector/tsquery) + pgvector
- LLM (generation): OpenRouter `openai/gpt-5-mini` (default), streaming enabled
- Libraries:
  - Vercel AI SDK (for streaming convenience)
  - PDF processing: `pdfminer.six` or `PyMuPDF` for text layer; fallback OCR:
    Tesseract; store page text + headings
  - Optional: “ultracite” for rendering citation lists/snippets (if applicable)

Env:
- OPENROUTER_API_KEY
- DATABASE_URL (Postgres)
- OCR tools in ingestion container (tesseract)

## 5. Data Model (Drizzle + pgvector)

Note: ensure `CREATE EXTENSION IF NOT EXISTS vector;`

```ts
// drizzle/schema.ts
import {
  pgTable,
  serial,
  text,
  varchar,
  integer,
  boolean,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { vector } from "drizzle-orm/pg-vector";

export const parties = pgTable(
  "parties",
  {
    id: serial("id").primaryKey(),
    key: varchar("key", { length: 32 }).notNull(), // "H", "Ap", "FrP", etc.
    name: varchar("name", { length: 128 }).notNull(),
    color: varchar("color", { length: 16 }).notNull(),
    logoUrl: text("logo_url"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    keyIdx: uniqueIndex("parties_key_uidx").on(t.key),
  })
);

export const documents = pgTable(
  "documents",
  {
    id: serial("id").primaryKey(),
    partyId: integer("party_id").notNull(),
    year: integer("year").notNull(),
    title: varchar("title", { length: 256 }).notNull(),
    pdfUrl: text("pdf_url").notNull(),
    pages: integer("pages").notNull(),
    hasOcr: boolean("has_ocr").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    isActive: boolean("is_active").default(true).notNull(),
  },
  (t) => ({
    partyYearIdx: uniqueIndex("documents_party_year_uidx").on(t.partyId, t.year),
    partyIdx: index("documents_party_idx").on(t.partyId),
    activeIdx: index("documents_active_idx").on(t.isActive),
  })
);

export const chunks = pgTable(
  "chunks",
  {
    id: serial("id").primaryKey(),
    documentId: integer("document_id").notNull(),
    partyId: integer("party_id").notNull(),
    year: integer("year").notNull(),
    pageStart: integer("page_start").notNull(),
    pageEnd: integer("page_end").notNull(),
    chapter: varchar("chapter", { length: 256 }),
    text: text("text").notNull(),
    // choose 1536 or 3072 dims depending on embedding model
    embedding: vector("embedding", { dimensions: 3072 }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    partyIdx: index("chunks_party_idx").on(t.partyId),
    docIdx: index("chunks_document_idx").on(t.documentId),
    vecIdx: index("chunks_embedding_idx").using(
      "ivfflat",
      t.embedding,
      "cosine"
    ),
  })
);

export const conversations = pgTable(
  "conversations",
  {
    id: serial("id").primaryKey(),
    userId: varchar("user_id", { length: 64 }), // nullable for anon
    title: varchar("title", { length: 256 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    userIdx: index("conversations_user_idx").on(t.userId),
  })
);

export const messages = pgTable(
  "messages",
  {
    id: serial("id").primaryKey(),
    conversationId: integer("conversation_id").notNull(),
    role: varchar("role", { length: 16 }).notNull(), // "user" | "system"
    content: text("content").notNull(),
    partiesSelected: jsonb("parties_selected"), // string[] of party keys
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    convIdx: index("messages_conversation_idx").on(t.conversationId),
  })
);

export const answers = pgTable(
  "answers",
  {
    id: serial("id").primaryKey(),
    messageId: integer("message_id").notNull(),
    partyId: integer("party_id").notNull(),
    model: varchar("model", { length: 128 }).notNull(), // "openai/gpt-5-mini"
    answerText: text("answer_text").notNull(),
    // compact JSON for UI rendering
    answerJson: jsonb("answer_json"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    ttftMs: integer("ttft_ms"), // time to first token
    totalTokens: integer("total_tokens"),
  },
  (t) => ({
    msgIdx: index("answers_message_idx").on(t.messageId),
    partyIdx: index("answers_party_idx").on(t.partyId),
  })
);

export const citations = pgTable(
  "citations",
  {
    id: serial("id").primaryKey(),
    answerId: integer("answer_id").notNull(),
    chunkId: integer("chunk_id").notNull(),
    documentId: integer("document_id").notNull(),
    partyId: integer("party_id").notNull(),
    year: integer("year").notNull(),
    chapter: varchar("chapter", { length: 256 }),
    pageStart: integer("page_start").notNull(),
    pageEnd: integer("page_end").notNull(),
    // short quoted snippet for preview
    snippet: text("snippet").notNull(),
    rank: integer("rank").notNull(), // 1..k
  },
  (t) => ({
    ansIdx: index("citations_answer_idx").on(t.answerId),
    chunkIdx: index("citations_chunk_idx").on(t.chunkId),
  })
);
```

Migration bootstrap (SQL):

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

## 6. Retrieval and Generation

### Ingestion Pipeline

- Input: Latest party program PDF per party; admin provides: party key, year,
  title, url.
- Steps:
  1) Download PDF
  2) Extract text layer via PyMuPDF; if insufficient text, OCR pages via
     Tesseract; keep page numbers
  3) Structure: detect headings (H1/H2) by font size/weight heuristics; attach
     chapter names to chunks
  4) Chunking: 800–1,000 tokens with 150 token overlap; store pageStart/pageEnd
  5) Embeddings: generate vectors per chunk
  6) Upsert into `chunks` with metadata

- Re‑ingest on new year version: set `documents.isActive=true` for latest and
  consider older as active=false (still queryable if needed).

### Retrieval

- Query rewrite (optional): light paraphrase to search query
- Hybrid search:
  - Full‑text: Postgres `tsvector` on chunk text (Norwegian config)
  - Vector: cosine similarity with pgvector
  - Merge: take top 30 union by both, then ML rerank to top‑k (6–8)
- Filters:
  - `partyId = ?`
  - prefer newest `documents.isActive=true` and highest `year`

### Reranking (optional, recommended)

- Self‑host `bge-reranker-v2-m3` (HTTP microservice). If unavailable, skip.

### Generation (per party)

- Model: OpenRouter `openai/gpt-5-mini` (streaming on)
- Prompting:
  - System: neutral, program‑tone, answer strictly from sources
  - User: question + concatenated top‑k excerpts with citations
  - Output: short answer (3–6 sentences) + citations list; optionally JSON

Prompt template (system):

```text
Du er en nøktern assistent som oppsummerer {{PARTI}}s politikk.
Svar KUN basert på utdragene (kildene) som følger. Dersom noe ikke omtales,
si: "Ikke omtalt i partiprogrammet ({{ÅR}})".
Vær presis, uten spekulasjoner. Oppgi alltid kilder (kapittel/side/år).
```

Prompt template (user):

```text
Spørsmål:
{{QUESTION}}

Utdrag:
{{#each EXCERPTS}}
[{{@index+1}}] ({{year}}, {{chapter}}, s.{{pageStart}}–{{pageEnd}})
{{text}}
{{/each}}

Instruks:
- Gi et kort hovedsvar (3–6 setninger) basert på utdragene.
- Deretter "Kilder:" som punktliste med [nr], (år/kapittel/side).
- Ikke legg til informasjon som ikke står i utdragene.
```

Optional JSON schema request:

```text
Returner i JSON:
{
  "answer": "string",
  "citations": [
    {
      "ref": 1,
      "year": 2025,
      "chapter": "string",
      "pageStart": 12,
      "pageEnd": 12
    }
  ]
}
```

Compare summary prompt (when user clicks “Compare summary”):

```text
Du skal sammenligne partienes svar under. Oppsummer likheter og forskjeller
kort og nøytralt, og oppgi kilder for hvert påstandspunkt.

Input:
{{ARRAY_OF_PARTY_ANSWERS_WITH_EXCERPTS}}

Output:
- 3–5 punktvise sammenligninger
- "Kilder:" samlet liste med [parti][nr] referanser
```

### Model and Parameters

- Generation:
  - provider: OpenRouter
  - model: `openai/gpt-5-mini`
  - temperature: 0.2–0.3
  - maxTokens: 700 per party
  - streaming: enabled
- Embeddings:
  - Option A (hosted, simple): OpenAI `text-embedding-3-large` (dimensions 3072)
    - Pros: high quality, easy
    - Cons: paid, external
  - Option B (self-host): BGE‑M3 (dims 1024) or Qwen‑Embedding‑4B
    - Pros: control/cost
    - Cons: infra
- Reranker:
  - Self‑host `bge-reranker-v2-m3` HTTP service (optional)
  - If absent, rely on hybrid scoring (FTS + vector) with MMR

## 7. API (orpc) Contracts

Namespace: `orpc.chat`

- `ask(input)`
  - Input:
    ```ts
    type AskInput = {
      question: string;
      partyKeys: string[]; // ["H", "FrP", "V"]
      conversationId?: number; // create if missing
      mode?: "answer" | "compare"; // default "answer"
    };
    ```
  - Output (mode="answer"):
    ```ts
    type PartyAnswer = {
      partyKey: string;
      partyName: string;
      model: string;
      answer: string; // markdown/plain
      citations: Array<{
        ref: number; // 1-based
        year: number;
        chapter?: string;
        pageStart: number;
        pageEnd: number;
        url: string;
        snippet: string;
      }>;
    };

    type AskOutput = {
      conversationId: number;
      answers: PartyAnswer[];
    };
    ```
  - Output (mode="compare"): `string` summary + aggregated citations

- `history.list()`
  - Input: `{ limit?: number }`
  - Output: list of conversations with latest messages

- `history.get({ conversationId })`
  - Output: messages + answers

- `history.rename({ conversationId, title })`
- `ingest.upsertDocument({ partyKey, year, title, pdfUrl })`
  - Triggers ingestion job (OCR if needed)
- `parties.list()`
  - Output: id/key/name/color/logoUrl/year(active)

## 8. UI/UX

- Layout:
  - Header: logo, title, disclaimer link
  - Chat bar:
    - Text input (Enter to send)
    - Party selector (toggle buttons with party logo/color). Allow 2–5 selected.
    - “Compare summary” button disabled until at least 2 answers exist.
  - Response area:
    - One card per selected party (fixed order by party name or user’s last order)
    - Card contents:
      - Header: party logo/name/year badge
      - Body: streamed answer
      - “Kilder” list with [1], [2], ...
      - Expand snippet per citation
      - “Åpne PDF” link (page anchor if supported)
  - History (optional visible when logged in):
    - Sidebar list of conversations; click to load
- Copy (bokmål):
  - Placeholder: “Still et politisk spørsmål …”
  - Compare button: “Sammenlign”
  - Citation heading: “Kilder”
  - Unknown: “Ikke omtalt i partiprogrammet ({{år}}).”
- Accessibility: keyboard navigation, focus states

## 9. Ingestion Service Sketch

```ts
// apps/worker/src/ingest.ts (or a server route with queue)
import { pdfToPagesOrOcr } from "./pdf";
import { detectHeadings } from "./headings";
import { chunkWithOverlap } from "./chunk";
import { embedBatch } from "./embed";
import { db } from "@/drizzle";
import { documents, chunks } from "@/drizzle/schema";

export async function ingestDocument({
  partyId,
  year,
  title,
  pdfUrl,
}: {
  partyId: number;
  year: number;
  title: string;
  pdfUrl: string;
}) {
  const { pages, hasOcr } = await pdfToPagesOrOcr(pdfUrl); // [{pageNo, text, blocks}]
  const withChapters = detectHeadings(pages);
  const chs = chunkWithOverlap(withChapters, {
    targetTokens: 900,
    overlapTokens: 150,
  });

  const vectors = await embedBatch(chs.map((c) => c.text)); // dims depends on model
  // upsert document
  const [doc] = await db
    .insert(documents)
    .values({ partyId, year, title, pdfUrl, pages: pages.length, hasOcr: hasOcr, isActive: true })
    .returning();

  for (let i = 0; i < chs.length; i++) {
    const c = chs[i];
    await db.insert(chunks).values({
      documentId: doc.id,
      partyId,
      year,
      pageStart: c.pageStart,
      pageEnd: c.pageEnd,
      chapter: c.chapter ?? null,
      text: c.text,
      embedding: vectors[i] as any,
    });
  }
}
```

## 10. Retrieval + Generation Sketch

```ts
// apps/web/src/server/rag.ts
import { db } from "@/drizzle";
import { chunks, documents, parties } from "@/drizzle/schema";
import { sql, eq, and, desc } from "drizzle-orm";
import { cosineDistance } from "drizzle-orm/pg-vector";
import { rerank } from "@/server/reranker"; // optional

type Retrieved = {
  id: number;
  text: string;
  chapter?: string;
  pageStart: number;
  pageEnd: number;
  year: number;
  pdfUrl: string;
  partyKey: string;
};

export async function retrieveForParty({
  partyId,
  queryEmbedding,
  k = 8,
}: {
  partyId: number;
  queryEmbedding: number[];
  k?: number;
}): Promise<Retrieved[]> {
  // Vector top N
  const vecTop = await db
    .select({
      id: chunks.id,
      text: chunks.text,
      chapter: chunks.chapter,
      pageStart: chunks.pageStart,
      pageEnd: chunks.pageEnd,
      year: chunks.year,
      docId: chunks.documentId,
      dist: cosineDistance(chunks.embedding, queryEmbedding as any),
    })
    .from(chunks)
    .where(eq(chunks.partyId, partyId))
    .orderBy((t) => t.dist)
    .limit(30);

  // Join URLs
  const withDocs = await Promise.all(
    vecTop.map(async (r) => {
      const [doc] = await db
        .select({ pdfUrl: documents.pdfUrl })
        .from(documents)
        .where(eq(documents.id, r.docId));
      return { ...r, pdfUrl: doc.pdfUrl };
    })
  );

  // Optionally rerank by query+text
  const final = await rerank(withDocs, k); // or simple top-k by dist
  return final as any;
}
```

```ts
// Generation with Vercel AI SDK + OpenRouter
import { streamText } from "ai";
import { createOpenRouter } from "openrouter-ai-sdk"; // or fetch call
const openrouter = createOpenRouter({ apiKey: process.env.OPENROUTER_API_KEY! });

export async function answerParty({
  partyName,
  question,
  excerpts,
}: {
  partyName: string;
  question: string;
  excerpts: {
    text: string;
    year: number;
    chapter?: string;
    pageStart: number;
    pageEnd: number;
    url: string;
  }[];
}) {
  const system = `Du er en nøktern assistent som oppsummerer ${partyName}s politikk.
Svar KUN basert på utdragene (kildene). Dersom noe ikke omtales,
si: "Ikke omtalt i partiprogrammet (${excerpts[0]?.year ?? ""})".
Oppgi alltid kilder (kapittel/side/år).`;

  const user =
    `Spørsmål:\n${question}\n\nUtdrag:\n` +
    excerpts
      .map(
        (e, i) =>
          `[${i + 1}] (${e.year}, ${e.chapter ?? "Uten kapittel"}, s.${e.pageStart}–${e.pageEnd})\n${e.text}`
      )
      .join("\n\n") +
    `\n\nInstruks:
- Kort hovedsvar (3–6 setninger).
- Deretter "Kilder:" med punkter [nr] og (år/kapittel/side).
- Ikke legg til info utenfor utdragene.`;

  const stream = await streamText({
    model: openrouter("openai/gpt-5-mini"),
    system,
    prompt: user,
    temperature: 0.25,
    maxTokens: 700,
  });

  return stream;
}
```

## 11. Auth and Persistence

- Anonymous browsing by default
- Optional login (e.g., OAuth GitHub/Google) to persist conversations
- Store conversations/messages/answers/citations when logged in
- Anonymous sessions may be kept client‑side (localStorage) or ephemeral server
  records without userId

## 12. Observability

- Log per party:
  - retrieval k, selected chunk IDs, vector distances
  - reranker on/off
  - ttft, total tokens, model id
- Simple admin view for last N ingestions and document versions

## 13. Evaluation Plan

- Golden set: 30–50 representative questions across:
  - Skatt, klima, skole, helse, innvandring, samferdsel, næring, forsvar
- For each, expected presence/absence and chapter references per party
- Metrics:
  - Citation validity rate (manual spot check)
  - “Not covered” accuracy
  - Latency p50/p95; token usage per party
- Regression: run weekly on current index; store scores

## 14. Risks and Mitigations

- OCR quality on scanned PDFs → Use high DPI, language pack for Norwegian in
  Tesseract, manual spot checks and re‑OCR if needed.
- Incorrect chapter detection → fallback to page‑based references; allow manual
  overrides in admin.
- Hallucinations → strict prompts + citations requirement, limit temperature,
  prefer “not covered” rather than guessing.
- Cost spikes → cap top‑k and maxTokens; cache retrieval by (party, questionHash)
  in DB; reuse embeddings.

## 15. Roadmap & Milestones

- M0 (Infra & ingestion) — 2–3 days
  - Postgres + pgvector in Docker
  - Drizzle schema and migrations
  - Ingestion CLI for 3–5 parties (PDF→OCR→chunks→embeddings)
- M1 (RAG backend) — 3–4 days
  - Hybrid retrieval + optional reranker
  - Per‑party answer route with streaming (orpc)
  - Citations model + linking to PDF
- M2 (UI) — 3–4 days
  - Chat bar with party toggles, side‑by‑side cards, “Compare summary”
  - Citation expansion and deep links
  - Basic history; optional auth
- M3 (Polish & eval) — 2–3 days
  - Golden set eval + tuning (k, overlap, MMR)
  - Caching; loading states; error boundaries
  - Simple admin for ingesting new PDFs

## 16. Configuration

- Default selected parties: none (prompt user to pick 2–5)
- Retrieval defaults:
  - k: 6
  - chunk size: 900 tokens, overlap: 150
  - union topN: 30 (FTS + vector), then rerank to k
- Models:
  - Generation: `openai/gpt-5-mini` (OpenRouter)
  - Embedding: OpenAI `text-embedding-3-large` (simple) OR BGE‑M3 (self‑host)
  - Reranker: `bge-reranker-v2-m3` (optional)
- Timeouts:
  - Retrieval: 1200 ms target
  - Generation: 20–30 s hard timeout per party

## 17. Disclaimer (UI)

- “Svarene er AI‑genererte oppsummeringer basert på partiprogrammer. De er ikke
  offisielle uttalelser. Se kildene for detaljer.”

## 18. Open Questions

- Which exact parties at launch? Provide initial list and assets (logo/color).
- Should we preload 2025 versions only, or keep 2021/2023 for reference (inactive)?
- Do we want page‑anchored links (PDF #page= param) for all sources?