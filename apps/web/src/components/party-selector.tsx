'use client';

import { CheckIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  const toggleParty = (partyId: string) => {
    if (selectedPartyIds.includes(partyId)) {
      onSelectionChange(selectedPartyIds.filter((id) => id !== partyId));
    } else {
      onSelectionChange([...selectedPartyIds, partyId]);
    }
  };

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {PARTIES.map((party) => {
        const isSelected = selectedPartyIds.includes(party.id);

        return (
          <Button
            className={cn(
              'relative h-8 px-3 py-1 font-medium text-xs transition-all',
              isSelected && 'pr-7'
            )}
            key={party.id}
            onClick={() => toggleParty(party.id)}
            size="sm"
            style={
              isSelected
                ? {
                    backgroundColor: party.color,
                    borderColor: party.color,
                    color: 'white',
                  }
                : {
                    borderColor: party.color,
                    color: party.color,
                  }
            }
            variant={isSelected ? 'default' : 'outline'}
          >
            {party.shortName}
            {isSelected && (
              <CheckIcon className="-translate-y-1/2 absolute top-1/2 right-1.5 size-3" />
            )}
          </Button>
        );
      })}

      {selectedPartyIds.length > 0 && (
        <Badge className="ml-2 h-8 px-2" variant="secondary">
          {selectedPartyIds.length} valgt
        </Badge>
      )}
    </div>
  );
}
