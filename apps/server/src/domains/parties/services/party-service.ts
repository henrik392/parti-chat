import { PARTY_NAMES } from '../constants/parties';

/**
 * Get party full name by short name
 */
export function getPartyName(shortName: string): string | null {
  return PARTY_NAMES[shortName] || null;
}

/**
 * Validate if party exists
 */
export function partyExists(shortName: string): boolean {
  return shortName in PARTY_NAMES;
}
