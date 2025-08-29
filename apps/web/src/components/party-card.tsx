'use client';

import { CopyIcon, ExternalLinkIcon } from 'lucide-react';
import { useState } from 'react';
import { Loader } from '@/components/ai-elements/loader';
import { Response } from '@/components/ai-elements/response';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

type Party = {
  id: string;
  name: string;
  shortName: string;
  color: string;
};

type Citation = {
  content: string;
  chapterTitle?: string;
  pageNumber?: number;
  similarity: number;
};

type MessagePart = {
  type: 'text';
  text: string;
};

type Message = {
  role: 'assistant' | 'user';
  parts?: MessagePart[];
};

type PartyCardProps = {
  party: Party;
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  className?: string;
};

export function PartyCard({
  party,
  messages,
  isLoading,
  error,
  className,
}: PartyCardProps) {
  const [showCitations, setShowCitations] = useState(false);

  // Get the latest assistant message
  const latestResponse = messages
    .filter((msg) => msg.role === 'assistant')
    .pop();

  const responseText =
    latestResponse?.parts
      ?.filter((part) => part.type === 'text')
      ?.map((part) => part.text)
      ?.join('') || '';

  // Extract citations from response (this would need to be implemented based on your citation format)
  const citations: Citation[] = []; // TODO: Extract from response or get from API

  const copyToClipboard = async () => {
    if (responseText) {
      await navigator.clipboard.writeText(responseText);
    }
  };

  const isNotCovered = responseText.includes('Ikke omtalt i partiprogrammet');

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Party Logo Placeholder */}
            <div
              className="flex size-10 items-center justify-center rounded-full font-semibold text-sm text-white"
              style={{ backgroundColor: party.color }}
            >
              {party.shortName}
            </div>
            <div>
              <h3 className="font-semibold text-lg">{party.name}</h3>
              <Badge
                className="mt-1"
                style={{
                  borderColor: party.color,
                  color: party.color,
                }}
                variant="secondary"
              >
                2025 Program
              </Badge>
            </div>
          </div>

          {responseText && !isLoading && (
            <Button
              className="shrink-0"
              onClick={copyToClipboard}
              size="icon"
              variant="ghost"
            >
              <CopyIcon className="size-4" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {/* Error State */}
        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-destructive text-sm">
            Feil ved henting av svar: {error}
          </div>
        )}

        {/* Loading State */}
        {isLoading && !responseText && (
          <div className="flex items-center gap-2 py-8">
            <Loader />
            <span className="text-muted-foreground text-sm">
              Henter svar fra {party.shortName}...
            </span>
          </div>
        )}

        {/* Response */}
        {responseText && (
          <div className="space-y-4">
            <div
              className={cn(
                'rounded-lg p-4',
                isNotCovered
                  ? 'border border-muted bg-muted/50'
                  : 'border bg-background'
              )}
            >
              <Response>{responseText}</Response>
              {isLoading && (
                <div className="mt-2 flex items-center gap-1">
                  <div className="size-2 animate-pulse rounded-full bg-primary" />
                  <div
                    className="size-2 animate-pulse rounded-full bg-primary/70"
                    style={{ animationDelay: '0.2s' }}
                  />
                  <div
                    className="size-2 animate-pulse rounded-full bg-primary/40"
                    style={{ animationDelay: '0.4s' }}
                  />
                </div>
              )}
            </div>

            {/* Citations Section */}
            {citations.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm">Kilder</h4>
                  <Badge className="text-xs" variant="outline">
                    {citations.length}
                  </Badge>
                </div>

                <div className="space-y-2">
                  {citations.map((citation, index) => (
                    <div
                      className="flex items-start gap-2 rounded-lg border p-3 text-sm"
                      key={`${citation.chapterTitle}-${index}`}
                    >
                      <Badge className="shrink-0" variant="secondary">
                        {index + 1}
                      </Badge>
                      <div className="flex-1 space-y-1">
                        <div className="font-medium">
                          {citation.chapterTitle || 'Ukjent kapittel'}
                          {citation.pageNumber && (
                            <span className="ml-2 font-normal text-muted-foreground">
                              Side {citation.pageNumber}
                            </span>
                          )}
                        </div>
                        <Button
                          className="h-auto p-0 text-xs"
                          size="sm"
                          variant="link"
                        >
                          <ExternalLinkIcon className="mr-1 size-3" />
                          Åpne PDF
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Show Excerpts Toggle */}
                <Collapsible
                  onOpenChange={setShowCitations}
                  open={showCitations}
                >
                  <CollapsibleTrigger asChild>
                    <Button className="w-full" size="sm" variant="outline">
                      {showCitations ? 'Skjul utdrag' : 'Vis utdrag'}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-2 pt-2">
                    {citations.map((citation, index) => (
                      <div
                        className="rounded-lg bg-muted/50 p-3 text-sm"
                        key={`excerpt-${citation.chapterTitle}-${index}`}
                      >
                        <div className="mb-2 flex items-center gap-2">
                          <Badge className="text-xs" variant="secondary">
                            {index + 1}
                          </Badge>
                          <span className="font-medium text-xs">
                            {citation.chapterTitle}
                          </span>
                        </div>
                        <p className="text-muted-foreground leading-relaxed">
                          {citation.content}
                        </p>
                      </div>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              </div>
            )}

            {/* Not Covered State */}
            {isNotCovered && (
              <div className="mt-3 text-center text-muted-foreground text-sm">
                Dette spørsmålet er ikke dekket i partiets offisielle program.
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
