'use client';

import { cn } from '@/lib/utils';
import { type ComponentProps } from 'react';
// Outer Card removed per request – keeping lightweight layout
import { Users2, BookOpen, Info, ShieldCheck, AlertCircle } from 'lucide-react';

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
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Still spørsmål til partiprogrammene
          </h1>
          <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
            Velg ett eller flere partier nederst og skriv spørsmålet ditt. Svaret baseres
            kun på partiprogrammene. Vi sier fra hvis temaet ikke omtales.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Feature icon={Users2} title="Velg partier" text="Sammenlign flere side om side." />
          <Feature icon={BookOpen} title="GPT‑5" text="Svar generert av GPT‑5 tilpasset partiprogrammer." />
          <Feature icon={Info} title="Ikke omtalt" text="Vi sier fra når noe mangler." />
          <Feature icon={ShieldCheck} title="Nøytralt" text="Svar baserer seg kun på partiprogrammene." />
        </div>
        <div
          className="relative mt-4 overflow-hidden rounded-md border border-red-300/60 bg-red-500/95 pl-5 pr-4 py-4 text-left shadow-sm backdrop-blur supports-[backdrop-filter]:backdrop-blur-sm before:absolute before:inset-y-0 before:left-0 before:w-1 before:bg-red-600 dark:border-red-500/50 dark:bg-red-600/90 dark:before:bg-red-700"
          role="note"
          aria-label="Advarsel om mulig feil"
        >
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-sm bg-red-600/60 p-2 text-white ring-1 ring-inset ring-white/20 dark:bg-red-700/70">
              <AlertCircle className="h-4 w-4" aria-hidden="true" />
            </div>
            <div className="space-y-1 text-white">
              <p className="text-sm font-semibold">Kan feile / hallusinere</p>
              <p className="text-xs leading-relaxed text-white/90">
                Modellen kan formulere noe unøyaktig. Kontroller viktig informasjon mot
                original partiprogramtekst.
              </p>
            </div>
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
        <Icon className="h-4 w-4" aria-hidden="true" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium leading-none">{title}</p>
        <p className="text-xs text-muted-foreground leading-relaxed">{text}</p>
      </div>
    </div>
  );
}

export default EmptyChatState;
