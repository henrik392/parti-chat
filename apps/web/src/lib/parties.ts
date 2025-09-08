export type Party = {
  name: string;
  shortName: string;
  color: string;
  pdfFilename: string;
  pdfUrl: string; // External URL to original PDF
};

// Party data with actual database party IDs (UUIDs)
export const PARTIES: Party[] = [
  {
    name: 'Arbeiderpartiet',
    shortName: 'AP',
    color: '#E5001A',
    pdfFilename: 'ap.pdf',
    pdfUrl: 'https://www.arbeiderpartiet.no/om/program/',
  },
  {
    name: 'Fremskrittspartiet',
    shortName: 'FrP',
    color: '#003C7F',
    pdfFilename: 'frp.pdf',
    pdfUrl: 'https://www.frp.no/files/Program/2025/Program-2025-2029.pdf',
  },
  {
    name: 'Høyre',
    shortName: 'H',
    color: '#0065F1',
    pdfFilename: 'h.pdf',
    pdfUrl: 'https://hoyre.no/politikk/partiprogram/',
  },
  {
    name: 'Kristelig Folkeparti',
    shortName: 'KrF',
    color: '#F9C835',
    pdfFilename: 'krf.pdf',
    pdfUrl: 'https://krf.no/politikk/politisk-program/',
  },
  {
    name: 'Miljøpartiet De Grønne',
    shortName: 'MDG',
    color: '#4B9F44',
    pdfFilename: 'mdg.pdf',
    pdfUrl:
      'https://mdg.no/_service/505809/download/id/1506077/name/MDGs+arbeidsprogram+2025-2029.pdf',
  },
  {
    name: 'Rødt',
    shortName: 'R',
    color: '#D50000',
    pdfFilename: 'r.pdf',
    pdfUrl: 'https://roedt.no/arbeidsprogram',
  },
  {
    name: 'Senterpartiet',
    shortName: 'SP',
    color: '#00843D',
    pdfFilename: 'sp.pdf',
    pdfUrl:
      'https://www.senterpartiet.no/politikk/program-uttaler/Nytt%20prinsipp-%20og%20handlingsprogram%202025-2029',
  },
  {
    name: 'Sosialistisk Venstreparti',
    shortName: 'SV',
    color: '#C4002C',
    pdfFilename: 'sv.pdf',
    pdfUrl: 'https://www.sv.no/politikken/arbeidsprogram/',
  },
  {
    name: 'Venstre',
    shortName: 'V',
    color: '#006B38',
    pdfFilename: 'v.pdf',
    pdfUrl: 'https://www.venstre.no/politikk/partiprogram/',
  },
] as const;
