import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import '../index.css';
import Providers from '@/components/providers';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Partichat | Sammenlign norske partiprogrammer - Politisk Q&A',
  description:
    'Få svar på politiske spørsmål fra norske partier grunnlagt i deres offisielle partiprogrammer. Sammenlign standpunkter side ved side med kildehenvisninger.',
  keywords: [
    'norske partier',
    'partiprogram',
    'politikk',
    'valg',
    'partipolitikk',
    'stortingsvalg',
    'arbeiderpartiet',
    'høyre',
    'fremskrittspartiet',
    'senterpartiet',
    'sosialistisk venstreparti',
    'rødt',
    'venstre',
    'kristelig folkeparti',
    'miljøpartiet de grønne',
    'politisk sammenligning',
    'partistandpunkter',
    'norsk politikk',
  ],
  authors: [{ name: 'Partichat' }],
  creator: 'Partichat',
  publisher: 'Partichat',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  ),
  alternates: {
    canonical: '/',
    languages: {
      'nb-NO': '/',
    },
  },
  openGraph: {
    type: 'website',
    locale: 'nb_NO',
    url: '/',
    title: 'Partichat | Sammenlign norske partiprogrammer',
    description:
      'Få svar på politiske spørsmål fra norske partier grunnlagt i deres offisielle partiprogrammer. Sammenlign standpunkter side ved side med kildehenvisninger.',
    siteName: 'Partichat',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Partichat | Sammenlign norske partiprogrammer',
    description:
      'Få svar på politiske spørsmål fra norske partier grunnlagt i deres offisielle partiprogrammer.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Partichat',
    description:
      'Sammenlign norske partiprogrammer og få svar på politiske spørsmål grunnlagt i offisielle partiprogrammer.',
    url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    applicationCategory: 'PoliticalApplication',
    operatingSystem: 'Web Browser',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'NOK',
    },
    inLanguage: 'nb-NO',
    audience: {
      '@type': 'Audience',
      geographicArea: {
        '@type': 'Country',
        name: 'Norge',
      },
    },
    about: [
      {
        '@type': 'Thing',
        name: 'Norsk politikk',
      },
      {
        '@type': 'Thing',
        name: 'Partiprogrammer',
      },
      {
        '@type': 'Thing',
        name: 'Stortingsvalg',
      },
    ],
  };

  return (
    <html lang="nb-NO" suppressHydrationWarning>
      <head>
        <script
          // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD structured data requires script injection
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c'),
          }}
          type="application/ld+json"
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>
          <div className="grid h-svh grid-rows-[auto_1fr]">{children}</div>
        </Providers>
      </body>
    </html>
  );
}
