'use client';
import { Badge } from '@/components/ui/badge';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { PARTIES } from '@/lib/parties';
import { cn } from '@/lib/utils';

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
    const RED_START = 0;
    const RED_END = 2;
    const GREEN_START = 2;
    const GREEN_END = 4;
    const BLUE_START = 4;
    const BLUE_END = 6;
    const HEX_BASE = 16;
    const RED_WEIGHT = 0.299;
    const GREEN_WEIGHT = 0.587;
    const BLUE_WEIGHT = 0.114;
    const MAX_RGB = 255;
    const LUMINANCE_THRESHOLD = 0.6;

    const c = hex.replace('#', '');
    const r = Number.parseInt(c.substring(RED_START, RED_END), HEX_BASE);
    const g = Number.parseInt(c.substring(GREEN_START, GREEN_END), HEX_BASE);
    const b = Number.parseInt(c.substring(BLUE_START, BLUE_END), HEX_BASE);
    // Relative luminance approximation
    const luminance =
      (RED_WEIGHT * r + GREEN_WEIGHT * g + BLUE_WEIGHT * b) / MAX_RGB;
    return luminance > LUMINANCE_THRESHOLD ? '#1a1a1a' : '#ffffff';
  };

  const _toggleParty = (partyId: string) => {
    if (selectedPartyIds.includes(partyId)) {
      onSelectionChange(selectedPartyIds.filter((id) => id !== partyId));
    } else {
      onSelectionChange([...selectedPartyIds, partyId]);
    }
  };

  return (
    <div className={cn('flex flex-wrap items-center gap-3', className)}>
      <ToggleGroup
        className="flex flex-wrap gap-2"
        onValueChange={(vals) => onSelectionChange(vals as string[])}
        size="sm"
        type="multiple"
        value={selectedPartyIds}
      >
        {PARTIES.map((party) => {
          const isSelected = selectedPartyIds.includes(party.id);
          const contrast = getContrastText(party.color);
          return (
            <ToggleGroupItem
              aria-label={party.name}
              className={cn(
                '!rounded-full relative h-8 flex-none overflow-hidden px-4 text-xs',
                'border transition-colors duration-150 ease-out',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
                'hover:bg-muted/70 hover:text-foreground data-[state=on]:hover:bg-transparent data-[state=on]:hover:text-[color:var(--party-contrast)]',
                'data-[state=on]:font-bold data-[state=on]:text-[color:var(--party-contrast)] data-[state=on]:shadow-sm data-[state=on]:hover:scale-[1.02] data-[state=on]:hover:shadow-md',
                'data-[state=off]:font-medium',
                'will-change-transform active:scale-[0.97] data-[state=on]:active:scale-[0.96]'
              )}
              data-state={isSelected ? 'on' : 'off'}
              key={party.id}
              style={
                isSelected
                  ? {
                      // Gradient for a bit of depth using party color
                      background: `linear-gradient(135deg, ${party.color} 0%, ${party.color}cc 100%)`,
                      borderColor: party.color,
                      // Provide CSS var for contrast text color
                      ['--party-contrast' as string]: contrast,
                      color: contrast,
                    }
                  : {
                      color: `${party.color}ee`, // even more opaque for better contrast
                      borderColor: `${party.color}cc`, // much darker border for better contrast
                      background: `${party.color}0a`, // very subtle background tint
                    }
              }
              value={party.id}
            >
              <span className="relative z-10">{party.shortName}</span>
              {isSelected && (
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 opacity-30 mix-blend-overlay"
                  style={{
                    background:
                      'radial-gradient(circle at 30% 30%, #ffffff55, transparent 70%)',
                  }}
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
