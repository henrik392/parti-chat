'use client';

import { PARTIES } from '@/lib/parties';

type ReferenceProps = {
  pageNumber: number;
  partyShortName: string;
  children: React.ReactNode;
};

export function Reference({
  pageNumber,
  partyShortName,
  children,
}: ReferenceProps) {
  const party = PARTIES.find(
    (p) => p.shortName.toLowerCase() === partyShortName.toLowerCase()
  );

  if (!party) {
    // Fallback: render as plain text if party not found
    return <span>{children}</span>;
  }

  const pdfUrl = `/party-programs/${party.pdfFilename}#page=${pageNumber}`;

  return (
    <a
      className="mx-0.5 inline text-blue-600 underline decoration-dotted underline-offset-2 transition-colors hover:text-blue-800"
      href={pdfUrl}
      rel="noopener noreferrer"
      target="_blank"
      title={`Åpne ${party.name} partiprogram på side ${pageNumber}`}
    >
      {children}
    </a>
  );
}
