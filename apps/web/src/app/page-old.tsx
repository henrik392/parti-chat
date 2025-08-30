'use client';

import { useChat } from '@ai-sdk/react';
import { eventIteratorToStream } from '@orpc/client';
import { useCallback, useEffect, useState } from 'react';
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation';
import {
  PromptInput,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputToolbar,
  PromptInputTools,
} from '@/components/ai-elements/prompt-input';
import { Suggestion, Suggestions } from '@/components/ai-elements/suggestion';
import { PartySelector } from '@/components/party-selector';
import { PartyTabs } from '@/components/party-tabs';
import { logger } from '@/lib/logger';
import { PARTIES, type Party } from '@/lib/parties';

type MessagePart = {
  type: 'text';
  text: string;
};

type Message = {
  role: 'assistant' | 'user';
  parts?: MessagePart[];
};

const suggestions = [
  'Hva er partiets syn på klimapolitikk?',
  'Hvordan skal Norge håndtere innvandring?',
  'Hvilken økonomisk politikk fører partiet?',
  'Hva mener partiet om skattepolitikk?',
];

const ChatBotDemo = () => {
  const [selectedPartyIds, setSelectedPartyIds] = useState<string[]>([]);
  const [selectedParties, setSelectedParties] = useState<Party[]>([]);
  const [activePartyId, setActivePartyId] = useState<string>('');

  // Use the useChat hook with custom transport for oRPC
  const { messages, input, handleInputChange, handleSubmit, status, error } = useChat({
    transport: {
      async sendMessages(options) {
        if (!activePartyId) {
          throw new Error('No active party selected');
        }
        
        const { client } = await import('@/utils/orpc');
        const result = await client.chat({
          messages: options.messages,
          partyId: activePartyId,
        }, { signal: options.abortSignal });
        
        return eventIteratorToStream(result);
      },
      reconnectToStream() {
        throw new Error('Unsupported');
      },
    },
  });

  // Update selected parties when IDs change
  useEffect(() => {
    const parties = PARTIES.filter((party) =>
      selectedPartyIds.includes(party.id)
    );
    setSelectedParties(parties);

    // Set first selected party as active if no active party
    if (parties.length > 0 && !activePartyId) {
      setActivePartyId(parties[0].id);
    }

    // Clear active party if it's no longer selected
    if (activePartyId && !selectedPartyIds.includes(activePartyId)) {
      setActivePartyId(parties[0]?.id || '');
    }
  }, [selectedPartyIds, activePartyId]);

  const handleStreamResponse = useCallback(async (eventIterator: any) => {
    let responseContent = '';

    try {
      logger.info('Starting to read stream...');
      
      // Convert oRPC event iterator to stream
      const { eventIteratorToStream } = await import('@orpc/client');
      const stream = eventIteratorToStream(eventIterator);
      
      // Get the reader from the stream
      const reader = stream.getReader();
      
      try {
        // biome-ignore lint: This is a stream reading loop with proper break condition
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }
          
          logger.debug(`Received chunk: ${JSON.stringify(value)}`);
          if (value && typeof value === 'object' && 'type' in value && value.type === 'text-delta') {
            const chunk = value as { type: string; textDelta: string };
            responseContent += chunk.textDelta;
          }
        }
      } finally {
        reader.releaseLock();
      }
      
      logger.info(
        `Stream completed, total content length: ${responseContent.length}`
      );
    } catch (error) {
      logger.error(
        `Stream error: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    return responseContent;
  }, []);

  const sendToParty = useCallback(
    async (question: string, partyId: string) => {
      logger.info(
        `Sending to party: ${partyId}, question: ${question.substring(0, 50)}...`
      );
      setPartyLoadingStates((prev) => ({ ...prev, [partyId]: true }));
      setPartyErrors((prev) => ({ ...prev, [partyId]: null }));

      try {
        const { client } = await import('@/utils/orpc');

        const messages = [
          {
            role: 'user' as const,
            content: question,
          },
        ];

        logger.info(`Calling client.chat with partyId: ${partyId}`);
        const result = await client.chat({
          messages,
          partyId,
        });
        logger.debug('Client.chat result received');

        const responseContent = await handleStreamResponse(result);
        logger.info(`Final response content length: ${responseContent.length}`);

        // biome-ignore lint/nursery/noUnnecessaryConditions: Content can be empty string
        if (responseContent) {
          setPartyMessages((prev) => ({
            ...prev,
            [partyId]: [
              ...(prev[partyId] || []),
              {
                role: 'assistant',
                parts: [{ type: 'text', text: responseContent }],
              },
            ],
          }));
          logger.info(`Added message to party: ${partyId}`);
        } else {
          logger.warn('No response content received');
          setPartyErrors((prev) => ({
            ...prev,
            [partyId]: 'No response received',
          }));
        }
      } catch (error) {
        logger.error(
          `Error in sendToParty: ${error instanceof Error ? error.message : String(error)}`
        );
        setPartyErrors((prev) => ({
          ...prev,
          [partyId]: error instanceof Error ? error.message : 'Unknown error',
        }));
      } finally {
        setPartyLoadingStates((prev) => ({ ...prev, [partyId]: false }));
      }
    },
    [handleStreamResponse]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && activePartyId) {
      sendToParty(input, activePartyId);
      setInput('');
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    if (activePartyId) {
      sendToParty(suggestion, activePartyId);
    }
  };

  const isAnyLoading = Object.values(partyLoadingStates).some(
    (loading) => loading
  );
  const hasAnyMessages = Object.values(partyMessages).some(
    (messages) => messages.length > 0
  );

  return (
    <div className="relative mx-auto size-full h-screen max-w-7xl p-6">
      <div className="flex h-full flex-col">
        <Conversation className="h-full">
          <ConversationContent>
            {/* Empty State */}
            {!hasAnyMessages && (
              <div className="flex h-full flex-col items-center justify-center gap-6">
                <div className="text-center">
                  <h2 className="mb-2 font-semibold text-2xl">
                    Political Party Chat
                  </h2>
                  <p className="mb-6 text-muted-foreground">
                    Velg partier og still spørsmål for å få svar fra
                    partiprogram
                  </p>

                  {selectedParties.length === 0 && (
                    <p className="mb-4 text-muted-foreground text-sm">
                      Velg minst ett parti for å komme i gang
                    </p>
                  )}
                </div>

                {selectedParties.length > 0 && (
                  <Suggestions className="max-w-2xl">
                    {suggestions.map((suggestion) => (
                      <Suggestion
                        key={suggestion}
                        onClick={handleSuggestionClick}
                        suggestion={suggestion}
                      />
                    ))}
                  </Suggestions>
                )}
              </div>
            )}

            {/* Party Tabs for Mobile/Single View */}
            {selectedParties.length > 0 && activePartyId && (
              <PartyTabs
                activePartyId={activePartyId}
                onTabChange={setActivePartyId}
                parties={selectedParties}
                partyErrors={partyErrors}
                partyLoadingStates={partyLoadingStates}
                partyMessages={partyMessages}
              />
            )}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>

        <div className="mt-4 space-y-3">
          <PartySelector
            className="px-1"
            onSelectionChange={setSelectedPartyIds}
            selectedPartyIds={selectedPartyIds}
          />

          <PromptInput onSubmit={handleSubmit}>
            <PromptInputTextarea
              onChange={(e) => setInput(e.target.value)}
              placeholder={(() => {
                if (selectedPartyIds.length === 0) {
                  return 'Velg partier først, så still ditt spørsmål...';
                }
                if (activePartyId) {
                  const activeParty = selectedParties.find(
                    (p) => p.id === activePartyId
                  );
                  return `Still spørsmål til ${activeParty?.shortName}...`;
                }
                return 'Still ditt spørsmål...';
              })()}
              value={input}
            />
            <PromptInputToolbar>
              <PromptInputTools>
                {selectedPartyIds.length === 0 && (
                  <span className="text-muted-foreground text-sm">
                    Velg minst ett parti for å fortsette
                  </span>
                )}
                {selectedPartyIds.length > 0 && activePartyId && (
                  <span className="text-muted-foreground text-sm">
                    Chatter med{' '}
                    {
                      selectedParties.find((p) => p.id === activePartyId)
                        ?.shortName
                    }
                  </span>
                )}
              </PromptInputTools>
              <PromptInputSubmit
                disabled={!(input && activePartyId)}
                status={isAnyLoading ? 'streaming' : undefined}
              />
            </PromptInputToolbar>
          </PromptInput>
        </div>
      </div>
    </div>
  );
};

export default ChatBotDemo;
