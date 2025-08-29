'use client';

import { useCallback, useState } from 'react';

type Party = {
  id: string;
  name: string;
  shortName: string;
  color: string;
};

type MessagePart = {
  type: 'text';
  text: string;
};

type Message = {
  role: 'assistant' | 'user';
  parts?: MessagePart[];
};

type PartyChat = {
  party: Party;
  messages: Message[];
  isLoading: boolean;
  error: string | null;
};

type MultiPartyChatState = {
  partyChats: PartyChat[];
  isAnyLoading: boolean;
  allFinished: boolean;
  sendToAll: (question: string) => void;
  reset: () => void;
};

export function useMultiPartyChat(
  selectedParties: Party[]
): MultiPartyChatState {
  const [partyChats, setPartyChats] = useState<PartyChat[]>([]);

  const sendToAll = useCallback(
    async (question: string) => {
      if (selectedParties.length === 0) {
        return;
      }

      // Initialize party chats with loading state
      const initialChats: PartyChat[] = selectedParties.map((party) => ({
        party,
        messages: [],
        isLoading: true,
        error: null,
      }));

      setPartyChats(initialChats);

      // Use the existing askParties endpoint (non-streaming for now)
      try {
        const { client } = await import('@/utils/orpc');
        const results = await client.askParties({
          question,
          selectedPartyIds: selectedParties.map((p) => p.id),
        });

        // Update party chats with results
        const updatedChats: PartyChat[] = selectedParties.map((party) => {
          const result = results.find((r) => r.party.id === party.id);
          if (result) {
            return {
              party,
              messages: [
                {
                  role: 'assistant',
                  parts: [{ type: 'text', text: result.answer }],
                },
              ],
              isLoading: false,
              error: null,
            };
          }
          return {
            party,
            messages: [],
            isLoading: false,
            error: 'No response received',
          };
        });

        setPartyChats(updatedChats);
      } catch (error) {
        // Handle global error - mark all as failed
        const errorChats: PartyChat[] = selectedParties.map((party) => ({
          party,
          messages: [],
          isLoading: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        }));
        setPartyChats(errorChats);
      }
    },
    [selectedParties]
  );

  const reset = useCallback(() => {
    setPartyChats([]);
  }, []);

  const isAnyLoading = partyChats.some((chat) => chat.isLoading);
  const allFinished =
    partyChats.length > 0 &&
    partyChats.every((chat) => chat.messages.length > 0 && !chat.isLoading);

  return {
    partyChats,
    isAnyLoading,
    allFinished,
    sendToAll,
    reset,
  };
}
