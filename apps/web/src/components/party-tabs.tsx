'use client';

import { motion } from 'motion/react';
import { PartyCard } from '@/components/party-card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSwipeNavigation } from '@/hooks/use-swipe-navigation';
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

const INACTIVE_SCALE = 0.95;
const DRAG_STIFFNESS = 400;
const NORMAL_STIFFNESS = 300;
const DRAG_DAMPING = 40;
const NORMAL_DAMPING = 30;
const SPRING_MASS = 0.8;

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
  const activeIndex = parties.findIndex((party) => party.id === activePartyId);

  const { handlePanStart, handlePan, handlePanEnd, swipeState } =
    useSwipeNavigation({
      activeIndex,
      totalItems: parties.length,
      onIndexChange: (newIndex) => {
        if (parties[newIndex]) {
          onTabChange(parties[newIndex].id);
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
          value={activePartyId}
        >
          <TabsList className="scrollbar-hide relative mx-auto w-fit max-w-full justify-center gap-1.5 overflow-x-auto rounded-full bg-transparent px-2 py-5 ring-1 ring-border/40 backdrop-blur-sm supports-[backdrop-filter]:bg-background/30">
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

      {/* Party Cards - All rendered but only active one visible with swipe support */}
      <motion.div
        animate={{
          x: swipeState.isDragging ? swipeState.offset : 0,
        }}
        className="absolute inset-0 top-16 cursor-grab select-none active:cursor-grabbing sm:top-20"
        onPan={handlePan}
        onPanEnd={handlePanEnd}
        onPanStart={handlePanStart}
        style={{
          touchAction: 'pan-y pinch-zoom',
        }}
        transition={{
          type: 'spring',
          stiffness: swipeState.isDragging ? DRAG_STIFFNESS : NORMAL_STIFFNESS,
          damping: swipeState.isDragging ? DRAG_DAMPING : NORMAL_DAMPING,
          mass: SPRING_MASS,
        }}
      >
        {parties.map((party) => (
          <motion.div
            animate={{
              opacity: party.id === activePartyId ? 1 : 0,
              scale: party.id === activePartyId ? 1 : INACTIVE_SCALE,
            }}
            className={cn(
              'absolute inset-0',
              party.id === activePartyId
                ? 'pointer-events-auto'
                : 'pointer-events-none'
            )}
            initial={false}
            key={party.id}
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
              showSuggestions={showSuggestions && party.id === activePartyId}
              suggestions={suggestions}
            />
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
