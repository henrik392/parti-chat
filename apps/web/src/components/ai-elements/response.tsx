'use client';

import { type ComponentProps, memo } from 'react';
import { Streamdown } from 'streamdown';
import { cn } from '@/lib/utils';
import { parseReferences } from '@/utils/parse-references';

type ResponseProps = ComponentProps<typeof Streamdown> & {
  partyShortName?: string;
};

export const Response = memo(
  ({ className, partyShortName, children, ...props }: ResponseProps) => {
    // If partyShortName is provided and children is a string, parse references
    if (partyShortName && typeof children === 'string') {
      const parsedContent = parseReferences({ text: children, partyShortName });

      return (
        <div
          className={cn(
            'size-full [&>*:first-child]:mt-0 [&>*:last-child]:mb-0',
            'prose prose-sm prose-gray max-w-none',
            // Fix bullet point positioning and styling
            '[&_ul]:!pl-6 [&_ol]:!pl-6',
            '[&_ul_li]:!ml-0 [&_ol_li]:!ml-0 [&_li]:!pl-0',
            '[&_ul_li::marker]:!text-gray-500 [&_ol_li::marker]:!text-gray-500',
            '[&_ul_li]:!mb-1 [&_ol_li]:!mb-1',
            '[&_ul]:!list-disc [&_ol]:!list-decimal',
            '[&_ul]:!mb-3 [&_ol]:!mb-3',
            // Better paragraph and heading spacing
            '[&_p]:!mb-2 [&_p:last-child]:!mb-0',
            '[&_h1]:!text-lg [&_h1]:!font-semibold [&_h1]:!mb-2 [&_h1]:!mt-0',
            '[&_h2]:!text-base [&_h2]:!font-semibold [&_h2]:!mb-2 [&_h2]:!mt-0',
            '[&_h3]:!text-sm [&_h3]:!font-semibold [&_h3]:!mb-1 [&_h3]:!mt-0',
            className
          )}
        >
          {parsedContent}
        </div>
      );
    }

    // For non-string content or no partyShortName, use Streamdown as before
    return (
      <Streamdown
        className={cn(
          'size-full [&>*:first-child]:mt-0 [&>*:last-child]:mb-0',
          'prose prose-sm prose-gray max-w-none',
          // Fix bullet point positioning and styling
          '[&_ul]:!pl-6 [&_ol]:!pl-6',
          '[&_ul_li]:!ml-0 [&_ol_li]:!ml-0 [&_li]:!pl-0',
          '[&_ul_li::marker]:!text-gray-500 [&_ol_li::marker]:!text-gray-500',
          '[&_ul_li]:!mb-1 [&_ol_li]:!mb-1',
          '[&_ul]:!list-disc [&_ol]:!list-decimal',
          '[&_ul]:!mb-3 [&_ol]:!mb-3',
          // Better paragraph and heading spacing
          '[&_p]:!mb-2 [&_p:last-child]:!mb-0',
          '[&_h1]:!text-lg [&_h1]:!font-semibold [&_h1]:!mb-2 [&_h1]:!mt-0',
          '[&_h2]:!text-base [&_h2]:!font-semibold [&_h2]:!mb-2 [&_h2]:!mt-0',
          '[&_h3]:!text-sm [&_h3]:!font-semibold [&_h3]:!mb-1 [&_h3]:!mt-0',
          className
        )}
        {...props}
      >
        {children}
      </Streamdown>
    );
  },
  (prevProps, nextProps) =>
    prevProps.children === nextProps.children &&
    prevProps.partyShortName === nextProps.partyShortName
);

Response.displayName = 'Response';
