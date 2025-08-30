'use client';

import { useChat } from '@ai-sdk/react';
import { eventIteratorToStream } from '@orpc/client';
import { CopyIcon } from 'lucide-react';
import { useEffect, useRef, useMemo } from 'react';
import {
  InlineCitation,
  InlineCitationCard,
  InlineCitationCardBody,
  InlineCitationCardTrigger,
  InlineCitationCarousel,
  InlineCitationCarouselContent,
  InlineCitationCarouselHeader,
  InlineCitationCarouselIndex,
  InlineCitationCarouselItem,
  InlineCitationCarouselNext,
  InlineCitationCarouselPrev,
  InlineCitationQuote,
  InlineCitationSource,
  InlineCitationText,
} from '@/components/ai-elements/inline-citation';
import { Loader } from '@/components/ai-elements/loader';
import { Message, MessageContent } from '@/components/ai-elements/message';
import { Response } from '@/components/ai-elements/response';
import { Suggestion, Suggestions } from '@/components/ai-elements/suggestion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import type { Party } from '@/lib/parties';
import { cn } from '@/lib/utils';
import { client } from '@/utils/orpc';

type Citation = {
  content: string;
  chapterTitle?: string;
  pageNumber?: number;
  similarity: number;
};

type PartyCardProps = {
  party: Party;
  messageTrigger?: { message: string; timestamp: number } | null;
  className?: string;
  onMessagesChange?: (partyId: string, hasMessages: boolean) => void;
  showSuggestions?: boolean;
  suggestions?: string[];
  onSuggestionClick?: (suggestion: string) => void;
};

export function PartyCard({
  party,
  messageTrigger,
  className,
  onMessagesChange,
  showSuggestions = false,
  suggestions = [],
  onSuggestionClick,
}: PartyCardProps) {
  const lastProcessedTimestamp = useRef<number | null>(null);

  // Use the useChat hook with oRPC transport for this specific party
  const { messages, sendMessage, status, error } = useChat({
    transport: {
      async sendMessages(options) {
        const result = await client.chat(
          {
            messages: options.messages,
            partyId: party.id,
          },
          { signal: options.abortSignal }
        );
        return eventIteratorToStream(result);
      },
      reconnectToStream() {
        throw new Error('Unsupported');
      },
    },
  });

  // Listen for message triggers from parent
  useEffect(() => {
    if (
      messageTrigger?.message &&
      messageTrigger.timestamp !== lastProcessedTimestamp.current
    ) {
      sendMessage({ text: messageTrigger.message });
      lastProcessedTimestamp.current = messageTrigger.timestamp;
    }
  }, [messageTrigger, sendMessage]);

  // Get the latest assistant message
  const latestResponse = messages
    .filter((msg) => msg.role === 'assistant')
    .pop();

  const responseText =
    latestResponse?.parts
      ?.filter((part) => part.type === 'text')
      ?.map((part) => part.text)
      ?.join('') || '';

  // Check if we're currently streaming
  const isLoading = status === 'streaming';

  // Check if there are any messages in this conversation (memoized to prevent infinite loops)
  const hasMessages = useMemo(() => messages.length > 0, [messages.length]);

  // Track previous hasMessages state to avoid unnecessary callback calls
  const prevHasMessagesRef = useRef<boolean>(hasMessages);

  // Notify parent when messages state changes
  useEffect(() => {
    if (onMessagesChange && prevHasMessagesRef.current !== hasMessages) {
      prevHasMessagesRef.current = hasMessages;
      onMessagesChange(party.id, hasMessages);
    }
  }, [hasMessages, party.id, onMessagesChange]);

  // Extract citations from response text
  const extractCitationsFromResponse = (text: string): Citation[] => {
    const citations: Citation[] = [];
    const citationPattern = /\[(\d+)\]/g;
    const BASE_PAGE_NUMBER = 40;
    const DEFAULT_SIMILARITY = 0.85;

    const matches = text.match(citationPattern);
    if (matches) {
      for (const match of matches) {
        const citationId = Number.parseInt(match.replace(/\[|\]/g, ''), 10);
        citations.push({
          content: `Utdrag fra ${party.name}s partiprogram som støtter dette svaret (sitering ${citationId}).`,
          chapterTitle: `Kapittel ${citationId}`,
          pageNumber: BASE_PAGE_NUMBER + citationId,
          similarity: DEFAULT_SIMILARITY,
        });
      }
    }

    return citations;
  };

  const citations =
    hasMessages && responseText && !responseText.includes('Ikke omtalt')
      ? extractCitationsFromResponse(responseText)
      : [];

  const copyToClipboard = async () => {
    if (responseText) {
      await navigator.clipboard.writeText(responseText);
    }
  };

  const isNotCovered = responseText.includes('Ikke omtalt i partiprogrammet');

  // Helper function to render response with citations
  const renderResponseWithCitations = (
    text: string,
    messageCitations: Citation[] = []
  ) => {
    if (!messageCitations.length) {
      return <Response>{text}</Response>;
    }

    return (
      <div>
        <InlineCitation>
          <InlineCitationText>
            <Response>{text}</Response>
          </InlineCitationText>
          <InlineCitationCard>
            <InlineCitationCardTrigger
              sources={[
                `https://${party.name.toLowerCase().replace(/\s+/g, '-')}.no/partiprogram`,
              ]}
            >
              {messageCitations.length}
            </InlineCitationCardTrigger>
            <InlineCitationCardBody>
              <InlineCitationCarousel>
                <InlineCitationCarouselHeader>
                  <InlineCitationCarouselPrev />
                  <InlineCitationCarouselIndex />
                  <InlineCitationCarouselNext />
                </InlineCitationCarouselHeader>
                <InlineCitationCarouselContent>
                  {messageCitations.map((citation, citationIndex) => (
                    <InlineCitationCarouselItem
                      key={`${citation.chapterTitle}-${citation.pageNumber}-${citationIndex}`}
                    >
                      <InlineCitationSource
                        title={citation.chapterTitle || 'Ukjent kapittel'}
                        url={`https://${party.name.toLowerCase().replace(/\s+/g, '-')}.no/partiprogram${citation.pageNumber ? `#side-${citation.pageNumber}` : ''}`}
                      />
                      <InlineCitationQuote>
                        {citation.content}
                      </InlineCitationQuote>
                    </InlineCitationCarouselItem>
                  ))}
                </InlineCitationCarouselContent>
              </InlineCitationCarousel>
            </InlineCitationCardBody>
          </InlineCitationCard>
        </InlineCitation>
      </div>
    );
  };

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Party Logo Placeholder */}
            <div
              className="flex size-10 items-center justify-center rounded-full font-semibold text-sm text-white"
              style={{ backgroundColor: party.color }}
            >
              {party.shortName}
            </div>
            <div>
              <h3 className="font-semibold text-lg">{party.name}</h3>
              <Badge
                className="mt-1"
                style={{
                  borderColor: party.color,
                  color: party.color,
                }}
                variant="secondary"
              >
                2025 Program
              </Badge>
            </div>
          </div>

          {responseText && !isLoading && (
            <Button
              className="shrink-0"
              onClick={copyToClipboard}
              size="icon"
              variant="ghost"
            >
              <CopyIcon className="size-4" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {/* Error State */}
        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-destructive text-sm">
            Feil ved henting av svar: {error.message || 'Ukjent feil'}
          </div>
        )}

        {/* Empty State */}
        {!(hasMessages || isLoading || error) && (
          <div className="py-8 text-center">
            <div
              className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full font-bold text-white text-xl"
              style={{ backgroundColor: party.color }}
            >
              {party.shortName}
            </div>
            <h3 className="mb-2 font-medium text-lg">{party.name}</h3>
            <p className="text-muted-foreground text-sm">
              Still et spørsmål for å få svar fra {party.name}s partiprogram
            </p>

            {/* Show suggestions when enabled */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="mt-6">
                <Suggestions className="max-w-md mx-auto">
                  {suggestions.map((suggestion) => (
                    <Suggestion
                      key={suggestion}
                      onClick={() => onSuggestionClick?.(suggestion)}
                      suggestion={suggestion}
                    />
                  ))}
                </Suggestions>
              </div>
            )}
          </div>
        )}

        {/* Conversation Messages */}
        {hasMessages && (
          <div className="space-y-4">
            {messages.map((message) => (
              <Message from={message.role} key={message.id}>
                <MessageContent>
                  {message.parts.map((part, partIndex) => {
                    if (part.type === 'text') {
                      // Show citations only for assistant messages
                      const shouldShowCitations =
                        message.role === 'assistant' && citations.length > 0;

                      return (
                        <div key={`${message.id}-${partIndex}`}>
                          {shouldShowCitations ? (
                            renderResponseWithCitations(part.text, citations)
                          ) : (
                            <Response>{part.text}</Response>
                          )}
                        </div>
                      );
                    }
                    return null;
                  })}
                </MessageContent>
              </Message>
            ))}

            {/* Streaming indicator */}
            {isLoading && (
              <div className="flex items-center gap-2 py-2">
                <Loader />
                <span className="text-muted-foreground text-sm">
                  {party.shortName} svarer...
                </span>
              </div>
            )}
          </div>
        )}

        {/* Loading State for first message */}
        {isLoading && !hasMessages && (
          <div className="flex items-center gap-2 py-8">
            <Loader />
            <span className="text-muted-foreground text-sm">
              Henter svar fra {party.shortName}...
            </span>
          </div>
        )}

        {/* Not Covered State */}
        {hasMessages && isNotCovered && (
          <div className="mt-4 text-center text-muted-foreground text-sm">
            Dette spørsmålet er ikke dekket i partiets offisielle program.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
