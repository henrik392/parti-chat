export type Party = {
  id: string;
  name: string;
  shortName: string;
  color: string;
};

// Hardcoded party data based on PDFs in party-program folder
export const PARTIES: Party[] = [
  { id: 'ap', name: 'Arbeiderpartiet', shortName: 'AP', color: '#E5001A' },
  { id: 'frp', name: 'Fremskrittspartiet', shortName: 'FrP', color: '#003C7F' },
  { id: 'h', name: 'Høyre', shortName: 'H', color: '#0065F1' },
  {
    id: 'krf',
    name: 'Kristelig Folkeparti',
    shortName: 'KrF',
    color: '#F9C835',
  },
  {
    id: 'mdg',
    name: 'Miljøpartiet De Grønne',
    shortName: 'MDG',
    color: '#4B9F44',
  },
  { id: 'rodt', name: 'Rødt', shortName: 'Rødt', color: '#D50000' },
  { id: 'sp', name: 'Senterpartiet', shortName: 'SP', color: '#00843D' },
  {
    id: 'sv',
    name: 'Sosialistisk Venstreparti',
    shortName: 'SV',
    color: '#C4002C',
  },
  { id: 'v', name: 'Venstre', shortName: 'V', color: '#006B38' },
] as const;
