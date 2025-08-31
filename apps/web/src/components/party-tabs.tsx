'use client';

import { motion } from 'motion/react';
import { PartyCard } from '@/components/party-card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSwipeNavigation } from '@/hooks/use-swipe-navigation';
import type { Party } from '@/lib/parties';
import { cn } from '@/lib/utils';

type PartyTabsProps = {
  parties: Party[];
  activePartyShortName: string;
  onTabChange: (partyShortName: string) => void;
  className?: string;
  messageTrigger?: { message: string; timestamp: number } | null;
  onPartyMessagesChange?: (
    partyShortName: string,
    hasMessages: boolean
  ) => void;
  showSuggestions?: boolean;
  suggestions?: string[];
  onSuggestionClick?: (suggestion: string) => void;
};

const INACTIVE_SCALE = 0.95;
const DRAG_STIFFNESS = 400;
const NORMAL_STIFFNESS = 300;
const DRAG_DAMPING = 40;
const NORMAL_DAMPING = 30;
const SPRING_MASS = 0.8;

export function PartyTabs({
  parties,
  activePartyShortName,
  onTabChange,
  className,
  messageTrigger,
  onPartyMessagesChange,
  showSuggestions = false,
  suggestions = [],
  onSuggestionClick,
}: PartyTabsProps) {
  const activeIndex = parties.findIndex(
    (party) => party.shortName === activePartyShortName
  );

  const { handlePanStart, handlePan, handlePanEnd, swipeState } =
    useSwipeNavigation({
      activeIndex,
      totalItems: parties.length,
      onIndexChange: (newIndex) => {
        if (parties[newIndex]) {
          onTabChange(parties[newIndex].shortName);
        }
      },
    });

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
          value={activePartyShortName}
        >
          <TabsList className="scrollbar-hide relative mx-auto w-fit max-w-full justify-center gap-1.5 overflow-x-auto rounded-full bg-transparent px-2 py-5 ring-1 ring-border/40 backdrop-blur-sm supports-[backdrop-filter]:bg-background/30">
            {parties.map((party) => {
              const isActive = party.shortName === activePartyShortName;
              return (
                <TabsTrigger
                  className={cn(
                    'h-8 flex-shrink-0 rounded-full px-8 text-sm transition-colors data-[state=active]:text-white data-[state=active]:shadow-sm',
                    'hover:bg-foreground/10 data-[state=active]:hover:brightness-110'
                  )}
                  key={party.shortName}
                  style={
                    {
                      '--tw-bg-opacity': isActive ? '1' : '0',
                      backgroundColor: isActive ? party.color : undefined,
                      color: isActive ? '#ffffff' : undefined,
                    } as React.CSSProperties
                  }
                  value={party.shortName}
                >
                  {party.shortName}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>
      </div>

      {/* Party Cards - All rendered but only active one visible with swipe support */}
      <motion.div
        animate={{
          x: swipeState.isSwipeActive ? swipeState.offset : 0,
        }}
        className="absolute inset-0 top-16 sm:top-20"
        onPan={handlePan}
        onPanEnd={handlePanEnd}
        onPanStart={handlePanStart}
        style={{
          touchAction: 'pan-y pinch-zoom',
        }}
        transition={{
          type: 'spring',
          stiffness: swipeState.isSwipeActive
            ? DRAG_STIFFNESS
            : NORMAL_STIFFNESS,
          damping: swipeState.isSwipeActive ? DRAG_DAMPING : NORMAL_DAMPING,
          mass: SPRING_MASS,
        }}
      >
        {parties.map((party) => (
          <motion.div
            animate={{
              opacity: party.shortName === activePartyShortName ? 1 : 0,
              scale:
                party.shortName === activePartyShortName ? 1 : INACTIVE_SCALE,
            }}
            className={cn(
              'absolute inset-0',
              party.shortName === activePartyShortName
                ? 'pointer-events-auto'
                : 'pointer-events-none'
            )}
            initial={false}
            key={party.shortName}
            style={{
              // Ensure the entire area is draggable, not just the content
              touchAction: 'pan-y pinch-zoom',
            }}
            transition={{
              type: 'spring',
              stiffness: 300,
              damping: 30,
              duration: 0.2,
            }}
          >
            <PartyCard
              messageTrigger={messageTrigger}
              onMessagesChange={onPartyMessagesChange}
              onSuggestionClick={onSuggestionClick}
              party={party}
              showSuggestions={
                showSuggestions && party.shortName === activePartyShortName
              }
              suggestions={suggestions}
            />
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
