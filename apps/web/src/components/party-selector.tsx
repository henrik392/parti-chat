'use client';

import { Badge } from '@/components/ui/badge';
import { PARTIES } from '@/lib/parties';
import { cn } from '@/lib/utils';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useMemo } from 'react';

type PartySelectorProps = {
  selectedPartyIds: string[];
  onSelectionChange: (partyIds: string[]) => void;
  className?: string;
};

export function PartySelector({
  selectedPartyIds,
  onSelectionChange,
  className,
}: PartySelectorProps) {
  // Simple contrast calculator to decide light/dark text over a party color
  const getContrastText = (hex: string) => {
    const c = hex.replace('#', '');
    const r = parseInt(c.substring(0, 2), 16);
    const g = parseInt(c.substring(2, 4), 16);
    const b = parseInt(c.substring(4, 6), 16);
    // Relative luminance approximation
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.6 ? '#1a1a1a' : '#ffffff';
  };

  const toggleParty = (partyId: string) => {
    if (selectedPartyIds.includes(partyId)) {
      onSelectionChange(selectedPartyIds.filter((id) => id !== partyId));
    } else {
      onSelectionChange([...selectedPartyIds, partyId]);
    }
  };

  return (
    <div className={cn('flex flex-wrap items-center gap-3', className)}>
      <ToggleGroup
        type="multiple"
        size="sm"
        value={selectedPartyIds}
        onValueChange={(vals) => onSelectionChange(vals as string[])}
        className="flex flex-wrap gap-2"
      >
        {PARTIES.map((party) => {
          const isSelected = selectedPartyIds.includes(party.id);
          const contrast = useMemo(() => getContrastText(party.color), [party.color]);
          return (
            <ToggleGroupItem
              key={party.id}
              value={party.id}
              aria-label={party.name}
              className={cn(
                'relative flex-none h-8 px-4 text-xs font-medium !rounded-full overflow-hidden',
                'border transition-colors duration-150 ease-out',
                'focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none',
                'hover:bg-muted/40 data-[state=off]:hover:text-foreground',
                'data-[state=on]:shadow-sm data-[state=on]:hover:shadow data-[state=on]:text-[color:var(--party-contrast)]',
                'active:scale-[0.97] data-[state=on]:active:scale-[0.96] will-change-transform'
              )}
              style={
                isSelected
                  ? {
                      // Gradient for a bit of depth using party color
                      background: `linear-gradient(135deg, ${party.color} 0%, ${party.color}cc 100%)`,
                      borderColor: party.color,
                      // Provide CSS var for contrast text color
                      ['--party-contrast' as any]: contrast,
                      color: contrast,
                    }
                  : {
                      color: party.color,
                      borderColor: party.color + '80', // semi transparent border for subtle look
                      background: 'transparent',
                    }
              }
              data-state={isSelected ? 'on' : 'off'}
            >
              <span className="relative z-10">{party.shortName}</span>
              {isSelected && (
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 opacity-30 mix-blend-overlay"
                  style={{ background: 'radial-gradient(circle at 30% 30%, #ffffff55, transparent 70%)' }}
                />
              )}
            </ToggleGroupItem>
          );
        })}
      </ToggleGroup>
      {selectedPartyIds.length > 0 && (
        <Badge className="h-8 rounded-full px-3 text-xs" variant="secondary">
          {selectedPartyIds.length} valgt
        </Badge>
      )}
    </div>
  );
}
