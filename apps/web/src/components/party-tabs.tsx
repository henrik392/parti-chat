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
  onPartyMessagesChange?: (partyId: string, hasMessages: boolean) => void;
  showSuggestions?: boolean;
  suggestions?: string[];
  onSuggestionClick?: (suggestion: string) => void;
};

export function PartyTabs({
  parties,
  activePartyId,
  onTabChange,
  className,
  messageTrigger,
  onPartyMessagesChange,
  showSuggestions = false,
  suggestions = [],
  onSuggestionClick,
}: PartyTabsProps) {
  if (parties.length === 0) {
    return null;
  }

  return (
    <div className={cn('flex h-full w-full flex-col', className)}>
      {/* Tab Navigation - Fixed */}
      <div className="-translate-x-1/2 fixed top-2 left-1/2 z-50 flex w-[calc(100vw-1rem)] max-w-5xl justify-center sm:top-6 sm:w-[calc(100vw-3rem)]">
        <Tabs
          className="flex flex-col"
          onValueChange={onTabChange}
          value={activePartyId}
        >
          <TabsList className="scrollbar-hide mx-auto w-fit max-w-full justify-center gap-1.5 overflow-x-auto rounded-full bg-transparent py-5 px-2 ring-1 ring-border/40 backdrop-blur-sm supports-[backdrop-filter]:bg-background/30">
            {parties.map((party) => {
              const isActive = party.id === activePartyId;
              return (
                <TabsTrigger
                  className={cn(
                    'h-8 flex-shrink-0 rounded-full px-8 text-sm transition-colors data-[state=active]:text-white data-[state=active]:shadow-sm',
                    'hover:bg-foreground/10 data-[state=active]:hover:brightness-110'
                  )}
                  key={party.id}
                  style={
                    {
                      '--tw-bg-opacity': isActive ? '1' : '0',
                      backgroundColor: isActive ? party.color : undefined,
                      color: isActive ? '#ffffff' : undefined,
                    } as React.CSSProperties
                  }
                  value={party.id}
                >
                  {party.shortName}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>
      </div>

      {/* Party Cards - All rendered but only active one visible */}
      <div className="relative mt-16 flex-1 sm:mt-20">
        {parties.map((party) => (
          <div
            className={cn(
              'absolute inset-0 transition-opacity duration-200',
              party.id === activePartyId
                ? 'pointer-events-auto opacity-100'
                : 'pointer-events-none opacity-0'
            )}
            key={party.id}
          >
            <PartyCard
              messageTrigger={messageTrigger}
              onMessagesChange={onPartyMessagesChange}
              onSuggestionClick={onSuggestionClick}
              party={party}
              showSuggestions={showSuggestions && party.id === activePartyId}
              suggestions={suggestions}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
