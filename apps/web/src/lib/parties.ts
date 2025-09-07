export type Party = {
  name: string;
  shortName: string;
  color: string;
};

// Party data with actual database party IDs (UUIDs)
export const PARTIES: Party[] = [
  {
    name: 'Arbeiderpartiet',
    shortName: 'AP',
    color: '#E5001A',
  },
  {
    name: 'Fremskrittspartiet',
    shortName: 'FrP',
    color: '#003C7F',
  },
  {
    name: 'Høyre',
    shortName: 'H',
    color: '#0065F1',
  },
  {
    name: 'Kristelig Folkeparti',
    shortName: 'KrF',
    color: '#F9C835',
  },
  {
    name: 'Miljøpartiet De Grønne',
    shortName: 'MDG',
    color: '#4B9F44',
  },
  {
    name: 'Rødt',
    shortName: 'R',
    color: '#D50000',
  },
  {
    name: 'Senterpartiet',
    shortName: 'SP',
    color: '#00843D',
  },
  {
    name: 'Sosialistisk Venstreparti',
    shortName: 'SV',
    color: '#C4002C',
  },
  {
    name: 'Venstre',
    shortName: 'V',
    color: '#006B38',
  },
] as const;
