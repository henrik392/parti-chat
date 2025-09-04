'use client';

import Image from 'next/image';
import posthog from 'posthog-js';
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
    const trimmedInput = input.trim();
    if (trimmedInput && selectedParties.length > 0) {
      posthog.capture('question_submitted', {
        question: trimmedInput,
        selected_parties: selectedPartyShortNames,
        party_count: selectedPartyShortNames.length,
        submission_method: 'manual',
      });
      // Broadcast message to all selected parties by updating the trigger
      setMessageTrigger({
        message: trimmedInput,
        timestamp: Date.now(),
      });
      setInput('');
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    if (selectedParties.length > 0) {
      posthog.capture('question_submitted', {
        question: suggestion,
        selected_parties: selectedPartyShortNames,
        party_count: selectedPartyShortNames.length,
        submission_method: 'suggestion',
      });
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
        {hasSelectedParties ? (
          // Dynamic conversation container with scroll behavior
          <Conversation className="h-full" initial="smooth" resize="smooth">
            <ConversationContent>
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
            </ConversationContent>
            <ConversationScrollButton />
          </Conversation>
        ) : (
          // Static container for empty state - no scrolling behavior
          <div className="relative flex-1 overflow-y-auto">
            <div className="p-2 sm:p-4">
              <EmptyChatState />
            </div>
          </div>
        )}

        <div className="space-y-3 px-2 pt-4 sm:px-4">
          <PartySelector
            className="px-0 sm:px-1"
            onSelectionChange={(names) => {
              posthog.capture('parties_selection_changed', {
                selected_parties: names,
                party_count: names.length,
              });
              setSelectedPartyShortNames(names);
            }}
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

          {/* Attribution */}
          <div className="flex justify-center pb-1 sm:pt-2">
            <a
              className="flex items-center gap-2 text-muted-foreground text-xs transition-colors hover:text-foreground"
              href="https://henrikkvamme.no"
              rel="noopener noreferrer"
              target="_blank"
            >
              <Image
                alt="Henrik Kvamme Logo"
                className="h-4 w-4"
                height={16}
                src="https://raw.githubusercontent.com/henrik392/portfolio/refs/heads/main/apps/web/public/images/logo-black.png"
                width={16}
              />
              <span className="font-mono">Laget av Henrik Kvamme</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatBotDemo;
