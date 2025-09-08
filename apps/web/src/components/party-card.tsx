'use client';

import { useChat } from '@ai-sdk/react';
import { eventIteratorToStream } from '@orpc/client';
import { CopyIcon } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader } from '@/components/ai-elements/loader';
import { Message, MessageContent } from '@/components/ai-elements/message';
import { Response } from '@/components/ai-elements/response';
import { Suggestion, Suggestions } from '@/components/ai-elements/suggestion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { Party } from '@/lib/parties';
import { cn } from '@/lib/utils';
import { client } from '@/utils/orpc';

type PartyCardProps = {
  party: Party;
  messageTrigger?: { message: string; timestamp: number } | null;
  className?: string;
  onMessagesChange?: (partyShortName: string, hasMessages: boolean) => void;
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
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);

  // Use the useChat hook with oRPC transport for this specific party
  const { messages, sendMessage, status, error } = useChat({
    transport: {
      async sendMessages(options) {
        const result = await client.chat(
          {
            messages: options.messages,
            partyShortName: party.shortName,
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
      setIsWaitingForResponse(true);
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

  // Check if we're currently streaming or waiting for response
  const isLoading = status === 'streaming' || isWaitingForResponse;

  // Clear waiting state when streaming starts or when we have an error
  useEffect(() => {
    if (status === 'streaming' || error) {
      setIsWaitingForResponse(false);
    }
  }, [status, error]);

  // Check if there are any messages in this conversation (memoized to prevent infinite loops)
  const hasMessages = useMemo(() => messages.length > 0, [messages.length]);

  // Track previous hasMessages state to avoid unnecessary callback calls
  const prevHasMessagesRef = useRef<boolean>(hasMessages);

  // Notify parent when messages state changes
  useEffect(() => {
    if (onMessagesChange && prevHasMessagesRef.current !== hasMessages) {
      prevHasMessagesRef.current = hasMessages;
      onMessagesChange(party.shortName, hasMessages);
    }
  }, [hasMessages, party.shortName, onMessagesChange]);

  const copyToClipboard = async () => {
    if (responseText) {
      await navigator.clipboard.writeText(responseText);
    }
  };

  const isNotCovered = responseText.includes('Ikke omtalt i partiprogrammet');

  return (
    <div className={cn('w-full space-y-4', className)}>
      {hasMessages && (
        <div className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="flex size-10 items-center justify-center rounded-full font-semibold text-sm text-white"
                style={{ backgroundColor: party.color }}
              >
                {party.shortName}
              </div>
              <div>
                <h3 className="m-0 font-semibold text-lg leading-tight">
                  {party.name}
                </h3>
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
        </div>
      )}

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
          {showSuggestions && suggestions.length > 0 && (
            <div className="mt-6">
              <Suggestions>
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
                    return (
                      <div key={`${message.id}-${partIndex}`}>
                        <Response partyShortName={party.shortName}>
                          {part.text}
                        </Response>
                      </div>
                    );
                  }
                  return null;
                })}
              </MessageContent>
            </Message>
          ))}
          {isLoading && (
            <div className="flex items-center gap-2 py-2">
              <Loader />
              <span className="text-muted-foreground text-sm">
                Søker gjennom {party.shortName}s partiprogram...
              </span>
            </div>
          )}
        </div>
      )}

      {isLoading && !hasMessages && (
        <div className="flex items-center gap-2 py-8">
          <Loader />
          <span className="text-muted-foreground text-sm">
            Søker gjennom {party.shortName}s partiprogram...
          </span>
        </div>
      )}

      {hasMessages && isNotCovered && (
        <div className="mt-4 text-center text-muted-foreground text-sm">
          Dette spørsmålet er ikke dekket i partiets offisielle program.
        </div>
      )}
    </div>
  );
}
