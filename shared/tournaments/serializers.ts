import { TournamentAggregate, StandingsRow } from './types';
import { PublicTournamentDto, PublicMatch } from './contracts';

export function toPublicMatch(match: TournamentAggregate['matches'][0]): PublicMatch {
  return {
    id: match.id,
    side: match.side,
    round: match.round,
    position: match.position,
    entrantAId: match.entrantAId,
    entrantBId: match.entrantBId,
    bestOf: match.bestOf,
    scoreA: match.scoreA,
    scoreB: match.scoreB,
    winnerId: match.winnerId,
    state: match.state,
  };
}

export function toPublicDto(
  aggregate: TournamentAggregate,
  standings: StandingsRow[] = []
): PublicTournamentDto {
  const { tournament, entrants, matches } = aggregate;
  return {
    id: tournament.id,
    name: tournament.name,
    format: tournament.format,
    entrantType: tournament.entrantType,
    status: tournament.status,
    defaultBestOf: tournament.defaultBestOf,
    version: tournament.version,
    createdAt: tournament.createdAt,
    updatedAt: tournament.updatedAt,
    entrants: entrants.map((e) => ({
      id: e.id,
      tournamentId: e.tournamentId,
      seed: e.seed,
      name: e.name,
      roster: e.roster ? [...e.roster] : [],
    })),
    matches: matches.map(toPublicMatch),
    standings: standings ? [...standings] : [],
  };
}
