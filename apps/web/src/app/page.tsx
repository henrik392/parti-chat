'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation';
import {
  PromptInput,
  PromptInputSubmit,
  PromptInputTextarea,
} from '@/components/ai-elements/prompt-input';
import { EmptyChatState } from '@/components/empty-chat-state';
import { PartySelector } from '@/components/party-selector';
import { PartyTabs } from '@/components/party-tabs';
import { PARTIES, type Party } from '@/lib/parties';

const suggestions = [
  'Hva er partiets syn på klimapolitikk?',
  'Hvordan skal Norge håndtere innvandring?',
  'Hva gjør partiet med økende levekostnader?',
  'Hva mener partiet om formuesskatt?',
];

const ChatBotDemo = () => {
  const [input, setInput] = useState('');
  const [selectedPartyShortNames, setSelectedPartyShortNames] = useState<
    string[]
  >([]);
  const [selectedParties, setSelectedParties] = useState<Party[]>([]);
  const [activePartyShortName, setActivePartyShortName] = useState<string>('');
  const [messageTrigger, setMessageTrigger] = useState<{
    message: string;
    timestamp: number;
  } | null>(null);
  const [partiesWithMessages, setPartiesWithMessages] = useState<Set<string>>(
    new Set()
  );

  // Update selected parties when short names change
  useEffect(() => {
    const parties = PARTIES.filter((party) =>
      selectedPartyShortNames.includes(party.shortName)
    );
    setSelectedParties(parties);

    // Set first selected party as active if no active party
    if (parties.length > 0 && !activePartyShortName) {
      setActivePartyShortName(parties[0].shortName);
    }

    // Clear active party if it's no longer selected
    if (
      activePartyShortName &&
      !selectedPartyShortNames.includes(activePartyShortName)
    ) {
      setActivePartyShortName(parties[0]?.shortName || '');
    }
  }, [selectedPartyShortNames, activePartyShortName]);

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
      // Send the message immediately
      setMessageTrigger({
        message: suggestion,
        timestamp: Date.now(),
      });
    }
  };

  const handlePartyMessagesChange = (
    partyShortName: string,
    hasMessages: boolean
  ) => {
    setPartiesWithMessages((prev) => {
      const newSet = new Set(prev);
      if (hasMessages) {
        newSet.add(partyShortName);
      } else {
        newSet.delete(partyShortName);
      }
      return newSet;
    });
  };

  const hasSelectedParties = selectedParties.length > 0;
  const hasAnyMessages = useMemo(
    () =>
      selectedParties.some((party) => partiesWithMessages.has(party.shortName)),
    [selectedParties, partiesWithMessages]
  );

  return (
    <div className="relative mx-auto size-full h-screen max-w-5xl p-2 sm:p-6">
      <div className="flex h-full flex-col">
        <Conversation className="h-full">
          <ConversationContent>
            {/* Empty State */}
            {!hasSelectedParties && <EmptyChatState />}

            {/* Party Tabs for conversations */}
            {hasSelectedParties && (
              <PartyTabs
                activePartyShortName={activePartyShortName}
                messageTrigger={messageTrigger}
                onPartyMessagesChange={handlePartyMessagesChange}
                onSuggestionClick={handleSuggestionClick}
                onTabChange={setActivePartyShortName}
                parties={selectedParties}
                showSuggestions={!hasAnyMessages}
                suggestions={suggestions}
              />
            )}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>

        <div className="space-y-3 px-2 pt-4 sm:px-4">
          <PartySelector
            className="px-0 sm:px-1"
            onSelectionChange={setSelectedPartyShortNames}
            selectedPartyShortNames={selectedPartyShortNames}
          />

          <PromptInput
            className="flex items-center divide-y-0 rounded-3xl border px-3 py-2"
            onSubmit={handleSubmit}
          >
            <div className="flex w-full items-center gap-2">
              <PromptInputTextarea
                minHeight={8}
                onChange={(e) => setInput(e.target.value)}
                placeholder={(() => {
                  if (selectedPartyShortNames.length === 0) {
                    return 'Velg partier først...';
                  }
                  return 'Still spørsmål';
                })()}
                value={input}
              />
              <PromptInputSubmit disabled={!(input && hasSelectedParties)} />
            </div>
          </PromptInput>
        </div>
      </div>
    </div>
  );
};

export default ChatBotDemo;
