import { BOUNDS, CreateTournamentInput, CreateEntrantInput, ApiErrorCode } from './contracts';
import { EntrantType } from './types';

export interface ValidationResult {
  valid: boolean;
  code?: ApiErrorCode;
  message?: string;
  fields?: Record<string, string>;
}

export function validateTournamentName(name: string): ValidationResult {
  const trimmed = (name || '').trim();
  if (!trimmed) {
    return { valid: false, code: 'TOURNAMENT_NAME_REQUIRED', message: 'Tournament name is required' };
  }
  if (trimmed.length > BOUNDS.MAX_TOURNAMENT_NAME_LENGTH) {
    return {
      valid: false,
      code: 'INVALID_INPUT',
      message: `Tournament name cannot exceed ${BOUNDS.MAX_TOURNAMENT_NAME_LENGTH} characters`,
    };
  }
  return { valid: true };
}

export function validateBestOf(bestOf: number): ValidationResult {
  if (!BOUNDS.ALLOWED_BEST_OF.includes(bestOf as any)) {
    return {
      valid: false,
      code: 'INVALID_BEST_OF',
      message: `Best-of must be an odd number from 1 to 15`,
    };
  }
  return { valid: true };
}

export function validateEntrantInput(entrant: CreateEntrantInput, entrantType: EntrantType): ValidationResult {
  const name = (entrant.name || '').trim();
  if (!name) {
    return { valid: false, code: 'INVALID_INPUT', message: 'Entrant name cannot be empty' };
  }
  if (name.length > BOUNDS.MAX_NAME_LENGTH) {
    return { valid: false, code: 'INVALID_INPUT', message: `Entrant name cannot exceed ${BOUNDS.MAX_NAME_LENGTH} characters` };
  }

  if (entrantType === 'team') {
    if (!entrant.roster || entrant.roster.length === 0) {
      return { valid: false, code: 'TEAM_ROSTER_REQUIRED', message: 'Teams must have at least one roster member' };
    }
    for (const member of entrant.roster) {
      const memberName = (member || '').trim();
      if (!memberName) {
        return { valid: false, code: 'INVALID_INPUT', message: 'Roster member name cannot be empty' };
      }
      if (memberName.length > BOUNDS.MAX_NAME_LENGTH) {
        return { valid: false, code: 'INVALID_INPUT', message: `Roster member name cannot exceed ${BOUNDS.MAX_NAME_LENGTH} characters` };
      }
    }
  }

  return { valid: true };
}

export function validateCreateTournamentInput(input: CreateTournamentInput): ValidationResult {
  const nameVal = validateTournamentName(input.name);
  if (!nameVal.valid) return nameVal;

  const bestOfVal = validateBestOf(input.defaultBestOf);
  if (!bestOfVal.valid) return bestOfVal;

  if (!input.entrants || input.entrants.length < BOUNDS.MIN_ENTRANTS || input.entrants.length > BOUNDS.MAX_ENTRANTS) {
    return {
      valid: false,
      code: 'ENTRANT_COUNT_OUT_OF_RANGE',
      message: `Tournament must have between ${BOUNDS.MIN_ENTRANTS} and ${BOUNDS.MAX_ENTRANTS} entrants`,
    };
  }

  for (let i = 0; i < input.entrants.length; i++) {
    const entrantVal = validateEntrantInput(input.entrants[i], input.entrantType);
    if (!entrantVal.valid) {
      return {
        ...entrantVal,
        fields: { entrantIndex: i.toString(), ...(entrantVal.fields || {}) },
      };
    }
  }

  return { valid: true };
}
