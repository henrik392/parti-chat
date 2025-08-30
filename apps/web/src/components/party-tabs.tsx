'use client';

import { PartyCard } from '@/components/party-card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Party } from '@/lib/parties';
import { cn } from '@/lib/utils';

type MessagePart = {
  type: 'text';
  text: string;
};

type Message = {
  role: 'assistant' | 'user';
  parts?: MessagePart[];
};

type PartyTabsProps = {
  parties: Party[];
  activePartyId: string;
  onTabChange: (partyId: string) => void;
  className?: string;
  partyMessages: Record<string, Message[]>;
  partyLoadingStates: Record<string, boolean>;
  partyErrors: Record<string, string | null>;
};

export function PartyTabs({
  parties,
  activePartyId,
  onTabChange,
  className,
  partyMessages,
  partyLoadingStates,
  partyErrors,
}: PartyTabsProps) {
  if (parties.length === 0) {
    return null;
  }

  return (
    <div className={cn('flex h-full w-full flex-col', className)}>
      <Tabs
        className="flex flex-1 flex-col"
        onValueChange={onTabChange}
        value={activePartyId}
      >
        <TabsList className="scrollbar-hide w-full justify-start overflow-x-auto">
          {parties.map((party) => (
            <TabsTrigger
              className="flex-shrink-0 data-[state=active]:text-white"
              key={party.id}
              style={{
                '--tw-bg-opacity': party.id === activePartyId ? '1' : '0',
                backgroundColor:
                  party.id === activePartyId ? party.color : undefined,
              }}
              value={party.id}
            >
              {party.shortName}
            </TabsTrigger>
          ))}
        </TabsList>

        {parties.map((party) => (
          <TabsContent className="mt-4 flex-1" key={party.id} value={party.id}>
            <PartyCard
              error={partyErrors[party.id] || null}
              isLoading={partyLoadingStates[party.id]}
              messages={partyMessages[party.id] || []}
              party={party}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
