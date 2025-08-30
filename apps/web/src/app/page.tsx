'use client';

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
  const [input, setInput] = useState('');
  const [selectedPartyIds, setSelectedPartyIds] = useState<string[]>([]);
  const [selectedParties, setSelectedParties] = useState<Party[]>([]);
  const [activePartyId, setActivePartyId] = useState<string>('');

  // State for individual party chats
  const [partyMessages, setPartyMessages] = useState<Record<string, Message[]>>(
    {}
  );
  const [partyLoadingStates, setPartyLoadingStates] = useState<
    Record<string, boolean>
  >({});
  const [partyErrors, setPartyErrors] = useState<Record<string, string | null>>(
    {}
  );

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

  const handleStreamResponse = useCallback(async (stream: any) => {
    let responseContent = '';

    try {
      for await (const chunk of stream) {
        if (chunk.type === 'text-delta') {
          responseContent += chunk.textDelta;
        }
      }
    } catch (error) {
      console.error('Stream error:', error);
    }

    return responseContent;
  }, []);

  const sendToParty = useCallback(
    async (question: string, partyId: string) => {
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

        const result = await client.chat({
          messages,
          partyId,
        });

        const responseContent = await handleStreamResponse(result);

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
        } else {
          setPartyErrors((prev) => ({
            ...prev,
            [partyId]: 'No response received',
          }));
        }
      } catch (error) {
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
