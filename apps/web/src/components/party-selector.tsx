'use client';

import { CheckIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Party = {
  id: string;
  name: string;
  shortName: string;
  color: string;
};

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
  const [parties, setParties] = useState<Party[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchParties() {
      try {
        const { client } = await import('@/utils/orpc');
        const partyData = await client.getParties();
        setParties([...partyData]);
      } catch {
        // Failed to fetch parties, continue with empty list
      } finally {
        setLoading(false);
      }
    }

    fetchParties();
  }, []);

  const toggleParty = (partyId: string) => {
    if (selectedPartyIds.includes(partyId)) {
      onSelectionChange(selectedPartyIds.filter((id) => id !== partyId));
    } else {
      onSelectionChange([...selectedPartyIds, partyId]);
    }
  };

  if (loading) {
    const skeletonIds = [
      'ap',
      'frp',
      'h',
      'krf',
      'mdg',
      'rodt',
      'sp',
      'sv',
      'v',
    ];
    return (
      <div className={cn('flex flex-wrap gap-2', className)}>
        {skeletonIds.map((id) => (
          <div
            className="h-8 w-12 animate-pulse rounded-md bg-muted"
            key={`skeleton-${id}`}
          />
        ))}
      </div>
    );
  }

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {parties.map((party) => {
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
