'use client';

import { Badge } from '@/components/ui/badge';
import { PARTIES } from '@/lib/parties';
import { cn } from '@/lib/utils';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

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
        {PARTIES.map((party) => (
          <ToggleGroupItem
            key={party.id}
            value={party.id}
            aria-label={party.name}
            className={cn(
              '!rounded-full first:!rounded-full last:!rounded-full overflow-hidden text-xs font-medium px-4 h-8 flex-none',
              'border data-[state=on]:text-white',
              // Override group item segmentation (remove merged look)
              'first:!rounded-full last:!rounded-full',
            )}
            style={{
              // Use party color only when active; rely on outline otherwise
              ...(selectedPartyIds.includes(party.id)
                ? { backgroundColor: party.color, borderColor: party.color }
                : { color: party.color, borderColor: party.color }),
            }}
            data-state={selectedPartyIds.includes(party.id) ? 'on' : 'off'}
          >
            {party.shortName}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      {selectedPartyIds.length > 0 && (
        <Badge className="h-8 rounded-full px-3 text-xs" variant="secondary">
          {selectedPartyIds.length} valgt
        </Badge>
      )}
    </div>
  );
}
