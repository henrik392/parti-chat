PRD: Multi‑Party Political Q&A Chat (Norway)

1. Product vision
- Provide neutral, side‑by‑side answers from selected Norwegian political parties to a user’s question, grounded strictly in the latest party programs (PDF). Make it easy to compare positions with transparent citations.

2. Goals and non‑goals
- Goals:
  - Let users select parties and get separate, source‑grounded answers for each.
  - Show citations with page/chapter links into the PDF.
  - Offer an optional “Compare summary” that highlights similarities/differences.
  - Allow saving conversation history (no login required; login enables cloud sync).
- Non‑goals:
  - No scraping of news, social media, or non‑program sources.
  - No policy predictions or opinions beyond what’s stated in party programs.

3. Target users and use cases
- Users: Voters, students, journalists, civic educators.
- Use cases:
  - Ask a policy question and see side‑by‑side answers from chosen parties.
  - Deep‑dive into sources via citations.
  - Generate a short comparison summary on demand.
  - Return to previous conversations (local or account‑synced).

4. Language and tone
- UI and outputs: Norwegian Bokmål only.
- Tone: Neutral, program‑adjacent, non‑confrontational. No speculation. If not covered: “Ikke omtalt i partiprogrammet (ÅÅÅÅ).”

5. Core user flows
- Select parties in the chat bar (multi‑select chips with party name/logo/color).
- Enter a question and submit.
- View side‑by‑side answer cards (one per party), each with:
  - Short answer (3–6 setninger), grounded in excerpts.
  - “Kilder” list with chapter and page; links open the PDF at the referenced page.
  - “Vis utdrag” to expand key evidence snippets.
- Optional: “Compare summary” button to generate a concise comparison with citations.
- History:
  - Without login: recent sessions saved locally.
  - With login: sessions saved to user account and retrievable across devices.

6. Content and data requirements
- Sources: Latest official party program PDFs only (per party).
- Versioning: Store and display year of each program; always prefer newest.
- OCR: PDFs are expected to be scanned; perform OCR so text and page numbers are retrievable.
- Citations:
  - Each answer must include at least one citation (preferably 1–3) with chapter/section and page number.
  - Citation links should open the source PDF at the correct page (e.g., ?page= or #page= when supported).

7. Functional requirements
- Party selection:
  - Parties are selectable at question time via chips beside the chat bar.
  - At least one party must be selected; multi‑select supported.
- Answering (per party):
  - Retrieval‑augmented: answers must be based only on retrieved excerpts from that party’s program.
  - If content isn’t found: explicitly state it’s not covered in the program (with year).
  - If conflicting excerpts exist: prefer newest version; note the ambiguity.
- Compare summary:
  - On demand; shows similarities and differences in bullet form.
  - Must cite sources for key points across the compared parties.
- History:
  - View, rename, and delete past conversations.
  - Optional login enables cloud persistence; otherwise store locally.
- Sharing (nice‑to‑have):
  - Shareable link to a single Q&A with selected parties.

8. Quality and guardrails
- Grounding: No statements beyond retrieved excerpts. No paraphrase that changes meaning.
- Hallucinations: If the answer cannot be supported by sources, say it’s not covered.
- Consistency: Use party‑neutral phrasing; avoid attributing motives or values not stated.
- Minimum citations: ≥1 per party answer; prefer 2+ when available.
- Accessibility: Clear contrasts, readable typography, keyboard‑friendly selection.

9. Non‑functional requirements (light)
- Performance targets:
  - Streaming responses; first token fast.
  - P95: initial content visible within ~2–3s per party; full answer within ~7s.
- Availability: Best effort; single‑region acceptable.
- Cost: Default to gpt‑5‑mini; keep context concise via focused retrieval.
- Privacy: Small project; store only what’s needed for history. No sensitive data expected.

10. System constraints (kept minimal)
- Stack: Next.js (frontend/backend), Bun runtime, Postgres with pgvector, Drizzle ORM, orpc API.
- Model: OpenRouter default model id openai/gpt-5-mini for generation.
- RAG behavior:
  - Retrieval per selected party; answers restricted to that party’s program.
  - Show citations with chapter/page; link into PDF.
  - Support OCR’d text to enable search and accurate page referencing.

11. UX requirements
- Layout:
  - Chat input at bottom with party chips on the right/left of the bar.
  - Results area shows side‑by‑side cards; responsive layout stacks on mobile.
- Cards:
  - Header with party logo/name/year tag.
  - Short answer + “Kilder” list; “Vis utdrag” accordion.
  - Copy button for the answer.
- Compare summary:
  - Button above cards; renders a concise, neutral summary with citations.
- Empty state and onboarding:
  - Short explanation and a few example questions ( norsk, nøytrale).
- Feedback:
  - “Var dette nyttig?” thumbs up/down with optional free‑text note.

12. Success metrics
- Accuracy: ≥95% of party answers include at least one valid citation; ≤1% known hallucinations in evaluation set.
- Coverage: ≥90% of evaluated questions produce grounded answers or “Ikke omtalt…” correctly.
- Latency: P95 within targets above.
- Engagement: ≥40% users use “Compare summary” in a session; ≥30% return to a saved conversation.

13. Risks and mitigations
- OCR errors → Use high‑quality OCR; allow users to view the exact excerpt to verify.
- Page linking variance across PDF viewers → Prefer stable links; where not supported, indicate chapter and page clearly.
- Ambiguous questions → Encourage clarification suggestions in the UI and allow the user to refine.
- Updates to programs → Display year prominently; add a note if a newer version is detected later.

14. Release plan (high level)
- M1: Ingestion of PDFs with OCR, metadata (party, year, chapter, page). Basic retrieval and per‑party answering with citations.
- M2: Side‑by‑side UI with party chips, streaming answers, and citation links.
- M3: Compare summary button + conversation history (local and account).
- M4: Polish (feedback, share link, accessibility, performance and caching).

15. Acceptance criteria (launch)
- Users can select multiple parties, ask a question, and receive side‑by‑side answers with at least one citation per card.
- Citation links open the correct PDF page and show chapter/page in the UI.
- “Compare summary” produces a concise, neutral comparison with citations.
- History works without login (local) and with login (cloud), with basic manage actions.
- All text in Norwegian Bokmål; tone is neutral and grounded.