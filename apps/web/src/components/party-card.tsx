'use client';

import { useChat } from '@ai-sdk/react';
import { eventIteratorToStream } from '@orpc/client';
import { CopyIcon, ExternalLinkIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
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
};

export function PartyCard({
  party,
  messageTrigger,
  className,
}: PartyCardProps) {
  const [showCitations, setShowCitations] = useState(false);
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
      console.log(`[PartyCard] Sending message to party: ${party.id} (${party.shortName})`, {
        message: messageTrigger.message,
        partyId: party.id
      });
      sendMessage({ text: messageTrigger.message });
      lastProcessedTimestamp.current = messageTrigger.timestamp;
    }
  }, [messageTrigger, sendMessage, party.id, party.shortName]);

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

  // Check if there are any messages in this conversation
  const hasMessages = messages.length > 0;

  // Extract citations from response (this would need to be implemented based on your citation format)
  const citations: Citation[] = []; // TODO: Extract from response or get from API

  const copyToClipboard = async () => {
    if (responseText) {
      await navigator.clipboard.writeText(responseText);
    }
  };

  const isNotCovered = responseText.includes('Ikke omtalt i partiprogrammet');

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
                      return (
                        <Response key={`${message.id}-${partIndex}`}>
                          {part.text}
                        </Response>
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

        {/* Legacy single response section - keeping for citations */}
        {responseText && citations.length > 0 && (
          <div className="mt-4 space-y-4">

            {/* Citations Section */}
            {citations.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm">Kilder</h4>
                  <Badge className="text-xs" variant="outline">
                    {citations.length}
                  </Badge>
                </div>

                <div className="space-y-2">
                  {citations.map((citation, index) => (
                    <div
                      className="flex items-start gap-2 rounded-lg border p-3 text-sm"
                      key={`${citation.chapterTitle}-${index}`}
                    >
                      <Badge className="shrink-0" variant="secondary">
                        {index + 1}
                      </Badge>
                      <div className="flex-1 space-y-1">
                        <div className="font-medium">
                          {citation.chapterTitle || 'Ukjent kapittel'}
                          {citation.pageNumber && (
                            <span className="ml-2 font-normal text-muted-foreground">
                              Side {citation.pageNumber}
                            </span>
                          )}
                        </div>
                        <Button
                          className="h-auto p-0 text-xs"
                          size="sm"
                          variant="link"
                        >
                          <ExternalLinkIcon className="mr-1 size-3" />
                          Åpne PDF
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Show Excerpts Toggle */}
                <Collapsible
                  onOpenChange={setShowCitations}
                  open={showCitations}
                >
                  <CollapsibleTrigger asChild>
                    <Button className="w-full" size="sm" variant="outline">
                      {showCitations ? 'Skjul utdrag' : 'Vis utdrag'}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-2 pt-2">
                    {citations.map((citation, index) => (
                      <div
                        className="rounded-lg bg-muted/50 p-3 text-sm"
                        key={`excerpt-${citation.chapterTitle}-${index}`}
                      >
                        <div className="mb-2 flex items-center gap-2">
                          <Badge className="text-xs" variant="secondary">
                            {index + 1}
                          </Badge>
                          <span className="font-medium text-xs">
                            {citation.chapterTitle}
                          </span>
                        </div>
                        <p className="text-muted-foreground leading-relaxed">
                          {citation.content}
                        </p>
                      </div>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              </div>
            )}

            {/* Not Covered State */}
            {isNotCovered && (
              <div className="mt-3 text-center text-muted-foreground text-sm">
                Dette spørsmålet er ikke dekket i partiets offisielle program.
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
