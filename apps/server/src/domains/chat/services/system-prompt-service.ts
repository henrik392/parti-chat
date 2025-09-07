import type { RagContext } from '../../rag/types';

/**
 * Generate system prompt based on RAG context availability
 */
export function getSystemPrompt(
  partyName: string,
  ragContext: RagContext | null
): string {
  if (ragContext) {
    // Use party name from RAG context if available, otherwise use provided partyName
    const contextPartyName = ragContext.partyName || partyName;
    const searchResultsText = ragContext.searchResults
      .map(
        (result) =>
          `[${result.id}] ${result.relevanceNote} (${result.similarity}) - ${result.chapterTitle}${result.pageNumber ? ` (side ${result.pageNumber})` : ''}:\n${result.content}`
      )
      .join('\n\n');

    return `Du er en nyttig assistent som svarer basert på ${contextPartyName}s partiprogram.

BRUKERENS SPØRSMÅL: "${ragContext.userQuestion}"

SØKERESULTATER FRA PARTIPROGRAMMET:
${searchResultsText}

INSTRUKSJONER:
- Vurder nøye om søkeresultatene faktisk svarer på brukerens spørsmål
- Hvis NOEN av søkeresultatene er relevante: Svar basert på informasjonen og referer til [nummer]
- Prioriter resultater med "Høy relevans" og "Middels relevans", men vurder også "Lav relevans" hvis de svarer på spørsmålet
- Hvis INGEN søkeresultater svarer på spørsmålet: Svar "Ikke omtalt i ${contextPartyName}s partiprogram"
- Ikke gjett eller lag opp svar som ikke er direkte støttet av søkeresultatene

FORMATERING OG LESBARHET:
- Bruk kortere setninger og tydelig struktur for bedre lesbarhet
- Del opp lange avsnitt med punktlister når det er naturlig
- Bruk overskrifter eller fet skrift for å fremheve hovedpunkter
- Unngå for lange setninger som kan være vanskelige å følge

SIDEHENVISNINGER:
- Når du siterer informasjon fra søkeresultatene, inkluder sidehenvisning i formatet (s. XX) der XX er sidenummeret
- Bare inkluder sidehenvisninger når de er tilgjengelige i søkeresultatene
- Eksempel: "Ifølge partiprogrammet støtter partiet økt pendlerfradrag (s. 29)"`;
  }

  return `Du er en nytlig assistent som svarer basert på ${partyName}s partiprogram.
         Ingen relevant informasjon ble funnet for dette spørsmålet.
         Svar "Ikke omtalt i ${partyName}s partiprogram."`;
}
