export type TournamentFormat = 'single_elimination' | 'double_elimination' | 'round_robin';
export type EntrantType = 'individual' | 'team';
export type TournamentStatus = 'draft' | 'active' | 'completed';
export type MatchState = 'blocked' | 'ready' | 'draft' | 'completed' | 'bye';
export type BracketSide = 'winners' | 'losers' | 'grand_final' | 'round_robin';

export type MatchSource =
  | { type: 'seed'; seed: number }
  | { type: 'match_winner'; matchId: string }
  | { type: 'match_loser'; matchId: string };

export interface Tournament {
  id: string;
  name: string;
  format: TournamentFormat;
  entrantType: EntrantType;
  status: TournamentStatus;
  defaultBestOf: number;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface Entrant {
  id: string;
  tournamentId: string;
  seed: number;
  name: string;
  roster: string[];
}

export interface Match {
  id: string;
  tournamentId: string;
  side: BracketSide;
  round: number;
  position: number;
  sourceA: MatchSource;
  sourceB: MatchSource;
  entrantAId: string | null;
  entrantBId: string | null;
  bestOf: number;
  scoreA: number | null;
  scoreB: number | null;
  winnerId: string | null;
  state: MatchState;
  privateNote: string | null;
}

export interface TournamentAggregate {
  tournament: Tournament;
  entrants: Entrant[];
  matches: Match[];
}

export interface StandingsRow {
  entrantId: string;
  rank: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  scoreFor: number;
  scoreAgainst: number;
  scoreDifference: number;
  points: number;
}
