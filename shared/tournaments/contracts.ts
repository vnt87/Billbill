import { TournamentFormat, EntrantType, TournamentAggregate, Entrant, StandingsRow, MatchState, BracketSide } from './types';

export const BOUNDS = {
  MIN_ENTRANTS: 2,
  MAX_ENTRANTS: 32,
  MAX_NAME_LENGTH: 80,
  MAX_TOURNAMENT_NAME_LENGTH: 120,
  MAX_NOTE_LENGTH: 1000,
  MIN_MANAGEMENT_PASSPHRASE_LENGTH: 3,
  MAX_MANAGEMENT_PASSPHRASE_LENGTH: 120,
  ALLOWED_BEST_OF: [1, 3, 5, 7, 9, 11, 13, 15] as const,
} as const;

export type ApiErrorCode =
  | 'TOURNAMENT_NAME_REQUIRED'
  | 'ENTRANT_COUNT_OUT_OF_RANGE'
  | 'TEAM_ROSTER_REQUIRED'
  | 'INVALID_BEST_OF'
  | 'MATCH_NOT_READY'
  | 'DRAW_NOT_ALLOWED'
  | 'INVALID_COMPLETION_SCORE'
  | 'INVALIDATION_CONFIRMATION_REQUIRED'
  | 'STALE_VERSION'
  | 'TOURNAMENT_NOT_FOUND'
  | 'PASSPHRASE_REQUIRED'
  | 'INVALID_PASSPHRASE'
  | 'ACCESS_DENIED'
  | 'UNSUPPORTED_COMMAND'
  | 'INVALID_INPUT';


export interface ApiSuccess<T> {
  data: T;
  version?: number;
}

export interface ApiError {
  error: {
    code: ApiErrorCode | string;
    message: string;
    fields?: Record<string, string>;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

export interface CreateEntrantInput {
  name: string;
  seed: number;
  roster: string[];
}

export interface CreateTournamentInput {
  name: string;
  format: TournamentFormat;
  entrantType: EntrantType;
  defaultBestOf: number;
  entrants: CreateEntrantInput[];
  managementPassphrase?: string;
}

export interface TournamentSummary {
  id: string;
  publicId: string;
  name: string;
  format: TournamentFormat;
  status: TournamentAggregate['tournament']['status'];
  createdAt: string;
  updatedAt: string;
}

export interface TournamentListDto {
  tournaments: TournamentSummary[];
}

export interface TournamentAccessResponse {
  managementToken: string;
  adminUrl: string;
}

export interface CreateTournamentResponseData {
  tournament: TournamentAggregate['tournament'];
  adminUrl: string;
  publicUrl: string;
}

export interface AdminTournamentDto {
  aggregate: TournamentAggregate;
  standings: StandingsRow[];
  publicUrl: string;
}

export interface PublicMatch {
  id: string;
  side: BracketSide;
  round: number;
  position: number;
  entrantAId: string | null;
  entrantBId: string | null;
  bestOf: number;
  scoreA: number | null;
  scoreB: number | null;
  winnerId: string | null;
  state: MatchState;
}

export interface PublicTournamentDto {
  id: string;
  name: string;
  format: TournamentFormat;
  entrantType: EntrantType;
  status: TournamentAggregate['tournament']['status'];
  defaultBestOf: number;
  version: number;
  createdAt: string;
  updatedAt: string;
  entrants: Entrant[];
  matches: PublicMatch[];
  standings: StandingsRow[];
}

export type MatchCommand =
  | { type: 'saveDraftScore'; scoreA: number | null; scoreB: number | null }
  | { type: 'completeResult'; scoreA: number; scoreB: number; winnerId?: string | null }
  | { type: 'clearResult' }
  | { type: 'updatePrivateNote'; note: string | null }
  | { type: 'overrideBestOf'; bestOf: number };

export type AggregateCommand =
  | { type: 'updateEntrants'; entrants: CreateEntrantInput[] }
  | { type: 'updateMetadata'; name?: string; defaultBestOf?: number };

export interface UpdateTournamentRequest {
  expectedVersion: number;
  command: AggregateCommand;
  confirmInvalidation?: string[];
}

export interface MatchMutationRequest {
  expectedVersion: number;
  command: MatchCommand;
  confirmInvalidation?: string[];
}
