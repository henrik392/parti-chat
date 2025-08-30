'use client';

import { useEffect, useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { eventIteratorToStream } from '@orpc/client';
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation';
import { Message, MessageContent } from '@/components/ai-elements/message';
import {
  PromptInput,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputToolbar,
  PromptInputTools,
} from '@/components/ai-elements/prompt-input';
import { Response } from '@/components/ai-elements/response';
import { Suggestion, Suggestions } from '@/components/ai-elements/suggestion';
import { PartySelector } from '@/components/party-selector';
import { PARTIES, type Party } from '@/lib/parties';
import { client } from '@/utils/orpc';

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

  // Use the useChat hook with oRPC transport
  const { messages, sendMessage, status } = useChat({
    transport: {
      async sendMessages(options) {
        return eventIteratorToStream(
          await client.chat(
            {
              messages: options.messages,
              partyId: activePartyId || undefined,
            },
            { signal: options.abortSignal }
          )
        );
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && activePartyId) {
      sendMessage({ text: input });
      setInput('');
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    if (activePartyId) {
      sendMessage({ text: suggestion });
    }
  };

  const hasMessages = messages.length > 0;

  return (
    <div className="relative mx-auto size-full h-screen max-w-7xl p-6">
      <div className="flex h-full flex-col">
        <Conversation className="h-full">
          <ConversationContent>
            {/* Empty State */}
            {!hasMessages && (
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

            {/* Messages */}
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
                status={status === 'streaming' ? 'streaming' : undefined}
              />
            </PromptInputToolbar>
          </PromptInput>
        </div>
      </div>
    </div>
  );
};

export default ChatBotDemo;