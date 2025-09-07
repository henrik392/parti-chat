# Backend API Reference

## Available Endpoints

### 1. Get Available Parties

**Endpoint:** `getParties`  
**Type:** Public procedure (no auth required)  
**Input:** None  
**Output:** Array of party objects

```typescript
type Party = {
  id: string;
  name: string;
  shortName: string;
  color: string; // hex color
}

// Returns:
[
  { id: 'ap', name: 'Arbeiderpartiet', shortName: 'AP', color: '#E5001A' },
  { id: 'frp', name: 'Fremskrittspartiet', shortName: 'FrP', color: '#003C7F' },
  { id: 'h', name: 'Høyre', shortName: 'H', color: '#0065F1' },
  { id: 'krf', name: 'Kristelig Folkeparti', shortName: 'KrF', color: '#F9C835' },
  { id: 'mdg', name: 'Miljøpartiet De Grønne', shortName: 'MDG', color: '#4B9F44' },
  { id: 'rodt', name: 'Rødt', shortName: 'R', color: '#D50000' },
  { id: 'sp', name: 'Senterpartiet', shortName: 'SP', color: '#00843D' },
  { id: 'sv', name: 'Sosialistisk Venstreparti', shortName: 'SV', color: '#C4002C' },
  { id: 'v', name: 'Venstre', shortName: 'V', color: '#006B38' }
]
```

### 2. Ask Question to Selected Parties

**Endpoint:** `askParties`  
**Type:** Public procedure (no auth required)  
**Input:** 
```typescript
{
  question: string; // User's question
  selectedPartyIds: string[]; // Array of party IDs (e.g., ['ap', 'h', 'sv'])
}
```

**Output:** Array of party answers
```typescript
type PartyAnswer = {
  party: {
    id: string;
    name: string;
    shortName: string;
    color: string;
  };
  answer: string; // 3-6 sentences in Norwegian
  citations: Citation[];
  hasContent: boolean; // false if "Ikke omtalt i partiprogrammet"
}

type Citation = {
  content: string; // Excerpt from party program
  chapterTitle?: string; // Chapter/section title
  pageNumber?: number; // PDF page number
  similarity: number; // 0-1 relevance score
}
```

### 3. Generate Comparison Summary

**Endpoint:** `compareParties`  
**Type:** Public procedure (no auth required)  
**Input:**
```typescript
{
  question: string; // Original question
  partyAnswers: PartyAnswer[]; // Results from askParties
}
```

**Output:** Comparison summary
```typescript
type ComparisonSummary = {
  similarities: string[]; // Array of similarity points in Norwegian
  differences: string[]; // Array of difference points in Norwegian
  citations: Array<{
    point: string; // The point being made
    supportingParties: Party[]; // Which parties support this
    citation: Citation; // Supporting evidence
  }>;
}
```

## Usage Examples

### Frontend Implementation Pattern

```typescript
import { orpcClient } from '@/utils/orpc';

// 1. Get parties for selection UI
const parties = await orpcClient.getParties();

// 2. Ask question to selected parties
const answers = await orpcClient.askParties({
  question: "Hva er partiets syn på klimapolitikk?",
  selectedPartyIds: ['ap', 'mdg', 'h']
});

// 3. Generate comparison (optional)
const comparison = await orpcClient.compareParties({
  question: "Hva er partiets syn på klimapolitikk?", 
  partyAnswers: answers
});
```

## UI Flow According to PRD

1. **Party Selection**: Use `getParties` to populate multi-select chips
2. **Question Input**: User enters question in chat input
3. **Get Answers**: Call `askParties` with question + selected party IDs  
4. **Display Results**: Show side-by-side cards for each party
5. **Optional Comparison**: Button to call `compareParties` for summary

## Response Language

- All responses are in **Norwegian Bokmål**
- Neutral, program-grounded tone
- If no content found: `"Ikke omtalt i partiprogrammet (YYYY)."`

## Error Handling

- Invalid party IDs are filtered out automatically
- Throws error if no valid parties selected
- RAG service handles cases where content isn't found

## Notes

- No authentication required for any endpoint
- Party data is hardcoded based on PDFs in `/party-program/`
- Citations include page numbers for PDF linking
- Answers are 3-6 sentences, grounded in party programs only