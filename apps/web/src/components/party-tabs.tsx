'use client';

import { PartyCard } from '@/components/party-card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Party } from '@/lib/parties';
import { cn } from '@/lib/utils';

type PartyTabsProps = {
  parties: Party[];
  activePartyId: string;
  onTabChange: (partyId: string) => void;
  className?: string;
  messageTrigger?: { message: string; timestamp: number } | null;
};

export function PartyTabs({
  parties,
  activePartyId,
  onTabChange,
  className,
  messageTrigger,
}: PartyTabsProps) {
  if (parties.length === 0) {
    return null;
  }

  return (
    <div className={cn('flex h-full w-full flex-col', className)}>
      {/* Tab Navigation */}
      <Tabs
        className="flex flex-col"
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
      </Tabs>

      {/* Party Cards - All rendered but only active one visible */}
      <div className="mt-4 flex-1 relative">
        {parties.map((party) => (
          <div
            key={party.id}
            className={cn(
              'absolute inset-0 transition-opacity duration-200',
              party.id === activePartyId
                ? 'opacity-100 pointer-events-auto'
                : 'opacity-0 pointer-events-none'
            )}
          >
            <PartyCard messageTrigger={messageTrigger} party={party} />
          </div>
        ))}
      </div>
    </div>
  );
}
