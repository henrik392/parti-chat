'use client';

import { useEffect, useState, useMemo } from 'react';
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
  const [messageTrigger, setMessageTrigger] = useState<{
    message: string;
    timestamp: number;
  } | null>(null);
  const [partiesWithMessages, setPartiesWithMessages] = useState<Set<string>>(new Set());

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
    // Just set the input value, don't send the message
    setInput(suggestion);
  };

  const handlePartyMessagesChange = (partyId: string, hasMessages: boolean) => {
    setPartiesWithMessages(prev => {
      const newSet = new Set(prev);
      if (hasMessages) {
        newSet.add(partyId);
      } else {
        newSet.delete(partyId);
      }
      return newSet;
    });
  };

  const hasSelectedParties = selectedParties.length > 0;
  const hasAnyMessages = useMemo(() =>
    selectedParties.some(party => partiesWithMessages.has(party.id)),
    [selectedParties, partiesWithMessages]
  );

  return (
    <div className="relative mx-auto size-full h-screen max-w-7xl p-6">
      <div className="flex h-full flex-col">
        <Conversation className="h-full">
          <ConversationContent>
            {/* Empty State */}
            {!hasSelectedParties && (
              <div className="flex h-full flex-col items-center justify-center gap-6 text-center">
                <h2 className="mb-2 font-semibold text-2xl">
                  Velg minst ett parti for å komme i gang
                </h2>
              </div>
            )}

            {/* Party Tabs for conversations */}
            {hasSelectedParties && (
              <PartyTabs
                activePartyId={activePartyId}
                messageTrigger={messageTrigger}
                onTabChange={setActivePartyId}
                parties={selectedParties}
                onPartyMessagesChange={handlePartyMessagesChange}
                showSuggestions={!hasAnyMessages}
                suggestions={suggestions}
                onSuggestionClick={handleSuggestionClick}
              />
            )}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>

        <div className="mt-4 space-y-3 px-4">
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
                    Sender til {selectedPartyIds.length} parti
                    {selectedPartyIds.length !== 1 ? 'er' : ''}
                  </span>
                )}
              </PromptInputTools>
              <PromptInputSubmit disabled={!(input && hasSelectedParties)} />
            </PromptInputToolbar>
          </PromptInput>
        </div>
      </div>
    </div>
  );
};

export default ChatBotDemo;
