'use client';

import { useEffect, useState } from 'react';
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
import { PartyCard } from '@/components/party-card';
import { PartySelector } from '@/components/party-selector';
import { useMultiPartyChat } from '@/hooks/use-multi-party-chat';

type Party = {
  id: string;
  name: string;
  shortName: string;
  color: string;
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
  const [allParties, setAllParties] = useState<Party[]>([]);

  const { partyChats, isAnyLoading, sendToAll } =
    useMultiPartyChat(selectedParties);

  // Fetch all parties on component mount
  useEffect(() => {
    async function fetchParties() {
      try {
        const { client } = await import('@/utils/orpc');
        const partyData = await client.getParties();
        setAllParties([...partyData]);
      } catch {
        // Failed to fetch parties, continue with empty list
      }
    }
    fetchParties();
  }, []);

  // Update selected parties when IDs change
  useEffect(() => {
    const parties = allParties.filter((party) =>
      selectedPartyIds.includes(party.id)
    );
    setSelectedParties(parties);
  }, [selectedPartyIds, allParties]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && selectedParties.length > 0) {
      sendToAll(input);
      setInput('');
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    if (selectedParties.length > 0) {
      sendToAll(suggestion);
    }
  };

  // Check if we have any responses to show
  const hasAnyResponses = partyChats.some((chat) => chat.messages.length > 0);

  return (
    <div className="relative mx-auto size-full h-screen max-w-7xl p-6">
      <div className="flex h-full flex-col">
        <Conversation className="h-full">
          <ConversationContent>
            {/* Empty State */}
            {!hasAnyResponses && (
              <div className="flex h-full flex-col items-center justify-center gap-6">
                <div className="text-center">
                  <h2 className="mb-2 font-semibold text-2xl">
                    Multi-Party Political Q&A Chat
                  </h2>
                  <p className="mb-6 text-muted-foreground">
                    Velg partier og still spørsmål for å sammenligne politiske
                    standpunkter
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

            {/* Party Cards Grid */}
            {hasAnyResponses && (
              <div className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {partyChats.map((partyChat) => (
                    <PartyCard
                      error={partyChat.error}
                      isLoading={partyChat.isLoading}
                      key={partyChat.party.id}
                      messages={partyChat.messages}
                      party={partyChat.party}
                    />
                  ))}
                </div>

                {/* Comparison Summary Placeholder */}
                {partyChats.filter((chat) => chat.messages.length > 0).length >
                  1 && (
                  <div className="mt-8 text-center">
                    {/* TODO: Add comparison summary button */}
                    <div className="rounded-lg border border-dashed p-6 text-muted-foreground">
                      Sammenligning kommer snart...
                    </div>
                  </div>
                )}
              </div>
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
              placeholder={
                selectedPartyIds.length === 0
                  ? 'Velg partier først, så still ditt spørsmål...'
                  : 'Still ditt spørsmål...'
              }
              value={input}
            />
            <PromptInputToolbar>
              <PromptInputTools>
                {selectedPartyIds.length === 0 && (
                  <span className="text-muted-foreground text-sm">
                    Velg minst ett parti for å fortsette
                  </span>
                )}
              </PromptInputTools>
              <PromptInputSubmit
                disabled={!input || selectedPartyIds.length === 0}
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
