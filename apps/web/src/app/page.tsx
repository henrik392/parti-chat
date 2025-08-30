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
import { PartySelector } from '@/components/party-selector';
import { PartyTabs } from '@/components/party-tabs';
import { PARTIES, type Party } from '@/lib/parties';

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
  const [messageTrigger, setMessageTrigger] = useState<{ message: string; timestamp: number } | null>(null);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && selectedParties.length > 0) {
      // Broadcast message to all selected parties by updating the trigger
      setMessageTrigger({
        message: input.trim(),
        timestamp: Date.now(),
      });
      setInput('');
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    if (selectedParties.length > 0) {
      // Broadcast suggestion to all selected parties
      setMessageTrigger({
        message: suggestion,
        timestamp: Date.now(),
      });
    }
  };

  const hasSelectedParties = selectedParties.length > 0;

  return (
    <div className="relative mx-auto size-full h-screen max-w-7xl p-6">
      <div className="flex h-full flex-col">
        <Conversation className="h-full">
          <ConversationContent>
            {/* Empty State */}
            {!hasSelectedParties && (
              <div className="flex h-full flex-col items-center justify-center gap-6">
                <div className="text-center">
                  <h2 className="mb-2 font-semibold text-2xl">
                    Political Party Chat
                  </h2>
                  <p className="mb-6 text-muted-foreground">
                    Velg partier og still spørsmål for å få svar fra
                    partiprogram
                  </p>
                  <p className="mb-4 text-muted-foreground text-sm">
                    Velg minst ett parti for å komme i gang
                  </p>
                </div>
              </div>
            )}

            {/* Suggestion State - when parties selected but no conversations yet */}
            {hasSelectedParties && (
              <div className="flex h-full flex-col">
                {/* Show suggestions at the top when no active conversations */}
                <div className="mb-6 flex flex-col items-center justify-center gap-6">
                  <div className="text-center">
                    <h2 className="mb-2 font-semibold text-2xl">
                      Political Party Chat
                    </h2>
                    <p className="mb-6 text-muted-foreground">
                      Still spørsmål til de valgte partiene for å sammenligne deres standpunkter
                    </p>
                  </div>

                  <Suggestions className="max-w-2xl">
                    {suggestions.map((suggestion) => (
                      <Suggestion
                        key={suggestion}
                        onClick={handleSuggestionClick}
                        suggestion={suggestion}
                      />
                    ))}
                  </Suggestions>
                </div>

                {/* Party Tabs for conversations */}
                <div className="flex-1">
                  <PartyTabs
                    activePartyId={activePartyId}
                    messageTrigger={messageTrigger}
                    onTabChange={setActivePartyId}
                    parties={selectedParties}
                  />
                </div>
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
              placeholder={(() => {
                if (selectedPartyIds.length === 0) {
                  return 'Velg partier først, så still ditt spørsmål...';
                }
                return 'Still spørsmål til alle valgte partier...';
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
                {selectedPartyIds.length > 0 && (
                  <span className="text-muted-foreground text-sm">
                    Sender til {selectedPartyIds.length} parti{selectedPartyIds.length !== 1 ? 'er' : ''}
                  </span>
                )}
              </PromptInputTools>
              <PromptInputSubmit
                disabled={!(input && hasSelectedParties)}
              />
            </PromptInputToolbar>
          </PromptInput>
        </div>
      </div>
    </div>
  );
};

export default ChatBotDemo;