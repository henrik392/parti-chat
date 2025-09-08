import type React from 'react';
import { Fragment } from 'react';
import { Streamdown } from 'streamdown';
import { Reference } from '@/components/reference';

type ParseReferencesProps = {
  text: string;
  partyShortName: string;
};

/**
 * Parses text content and replaces page references (s. XX) with clickable Reference components
 * First processes markdown, then injects Reference components
 */
export function parseReferences({
  text,
  partyShortName,
}: ParseReferencesProps): React.ReactNode {
  // Regex to match page references like (s. 29) or (s.29)
  const referenceRegex = /\(s\.\s*(\d+)\)/gi;

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;
  let keyCounter = 0;

  while ((match = referenceRegex.exec(text)) !== null) {
    const fullMatch = match[0]; // e.g., "(s. 29)"
    const pageNumber = Number.parseInt(match[1], 10); // e.g., 29
    const matchStart = match.index;
    const matchEnd = match.index + fullMatch.length;

    // Add text before the reference with markdown processing
    if (matchStart > lastIndex) {
      const textBefore = text.slice(lastIndex, matchStart);
      if (textBefore) {
        parts.push(
          <Streamdown key={`text-${keyCounter}`}>{textBefore}</Streamdown>
        );
      }
    }

    // Add the clickable reference
    parts.push(
      <Reference
        key={`ref-${keyCounter++}`}
        pageNumber={pageNumber}
        partyShortName={partyShortName}
      >
        {fullMatch}
      </Reference>
    );

    lastIndex = matchEnd;
  }

  // Add remaining text after the last reference with markdown processing
  if (lastIndex < text.length) {
    const remainingText = text.slice(lastIndex);
    if (remainingText) {
      parts.push(
        <Streamdown key={`text-${keyCounter}`}>{remainingText}</Streamdown>
      );
    }
  }

  // If no references found, return the original text with markdown processing
  if (parts.length === 0) {
    return <Streamdown>{text}</Streamdown>;
  }

  return <Fragment>{parts}</Fragment>;
}
