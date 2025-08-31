'use client';

// Outer Card removed per request – keeping lightweight layout
import { AlertCircle, BookOpen, Info, ShieldCheck, Users2 } from 'lucide-react';
import type { ComponentProps } from 'react';
import { GitHubButton } from '@/components/github-button';
import { cn } from '@/lib/utils';

type EmptyChatStateProps = {
  className?: string;
} & ComponentProps<'div'>;

export function EmptyChatState({ className, ...props }: EmptyChatStateProps) {
  return (
    <div
      className={cn(
        'relative mx-auto flex w-full max-w-5xl flex-col items-center px-6 py-14 sm:py-20',
        className
      )}
      {...props}
    >
      <div className="w-full max-w-3xl space-y-8 text-center">
        <div className="space-y-4">
          <h1 className="font-semibold text-3xl tracking-tight sm:text-4xl">
            Still spørsmål til partiprogrammene
          </h1>
          <p className="text-base text-muted-foreground leading-relaxed sm:text-lg">
            Velg ett eller flere partier nederst og skriv spørsmålet ditt.
            Svaret baseres kun på partiprogrammene. Vi sier fra hvis temaet ikke
            omtales.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Feature
            icon={Users2}
            text="Sammenlign flere side om side."
            title="Velg partier"
          />
          <Feature
            icon={BookOpen}
            text="Svar generert av GPT‑5 tilpasset partiprogrammer."
            title="GPT‑5"
          />
          <Feature
            icon={Info}
            text="Vi sier fra når noe mangler."
            title="Ikke omtalt"
          />
          <Feature
            icon={ShieldCheck}
            text="Svar baserer seg kun på partiprogrammene."
            title="Nøytralt"
          />
        </div>

        <div
          aria-label="Advarsel om mulig feil"
          className="relative mt-4 overflow-hidden rounded-md border border-yellow-300/60 bg-yellow-50 py-4 pr-4 pl-5 text-left shadow-sm backdrop-blur before:absolute before:inset-y-0 before:left-0 before:w-2 before:bg-yellow-400 supports-[backdrop-filter]:backdrop-blur-sm"
          role="note"
        >
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-sm bg-yellow-400/80 p-2 text-black ring-1 ring-black/10 ring-inset">
              <AlertCircle aria-hidden="true" className="h-4 w-4" />
            </div>
            <div className="space-y-1 text-black">
              <p className="font-semibold text-sm">Kan feile / hallusinere</p>
              <p className="text-black/80 text-xs leading-relaxed">
                Modellen kan formulere noe unøyaktig. Kontroller viktig
                informasjon mot original partiprogramtekst.
              </p>
            </div>
          </div>
        </div>

        {/* GitHub Link */}
        <div className="mt-6 flex justify-center">
          <div className="inline-flex">
            <GitHubButton />
          </div>
        </div>
      </div>
    </div>
  );
}

type FeatureProps = {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  text: string;
};

function Feature({ icon: Icon, title, text }: FeatureProps) {
  return (
    <div className="flex items-start gap-3 rounded-lg border bg-muted/40 px-4 py-3 text-left">
      <div className="mt-0.5 rounded-md bg-primary/10 p-2 text-primary">
        <Icon aria-hidden="true" className="h-4 w-4" />
      </div>
      <div className="space-y-1">
        <p className="font-medium text-sm leading-none">{title}</p>
        <p className="text-muted-foreground text-xs leading-relaxed">{text}</p>
      </div>
    </div>
  );
}

export default EmptyChatState;
