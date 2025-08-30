export type Party = {
  id: string;
  name: string;
  shortName: string;
  color: string;
};

// Party data with actual database party IDs (UUIDs)
export const PARTIES: Party[] = [
  { id: '96bab927-4bc8-41d4-a82f-986f02245a65', name: 'Arbeiderpartiet', shortName: 'AP', color: '#E5001A' },
  { id: 'c5da6b28-f27b-4b80-81fe-2476733c04d9', name: 'Fremskrittspartiet', shortName: 'FrP', color: '#003C7F' },
  { id: '8b13ec72-4b8c-4544-814a-d9d5fe263713', name: 'Høyre', shortName: 'H', color: '#0065F1' },
  {
    id: '839b43bd-0d67-4126-acfc-c7537a79d390',
    name: 'Kristelig Folkeparti',
    shortName: 'KrF',
    color: '#F9C835',
  },
  {
    id: '1d09e1ee-c3b4-4777-aafb-d2eb5bb2a830',
    name: 'Miljøpartiet De Grønne',
    shortName: 'MDG',
    color: '#4B9F44',
  },
  { id: '48f4b362-91ef-44fe-8787-06b7cd06a480', name: 'Rødt', shortName: 'Rødt', color: '#D50000' },
  { id: 'a1ea74a7-bac3-40ba-a748-199bce9f8a79', name: 'Senterpartiet', shortName: 'SP', color: '#00843D' },
  {
    id: 'eff941a7-e564-4be1-8f03-0c59d1a140f1',
    name: 'Sosialistisk Venstreparti',
    shortName: 'SV',
    color: '#C4002C',
  },
  { id: 'e20772a9-5612-418c-95d1-2be5a04fdf34', name: 'Venstre', shortName: 'V', color: '#006B38' },
] as const;
