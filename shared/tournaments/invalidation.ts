import { TournamentAggregate, Entrant, Match } from './types';
import { generateSingleEliminationMatches } from './generateSingleElimination';
import { generateDoubleEliminationMatches } from './generateDoubleElimination';
import { generateRoundRobinMatches } from './generateRoundRobin';

export interface InvalidationPreview {
  desiredAggregate: TournamentAggregate;
  invalidatedMatchIds: string[];
}

export function reconcileAggregateEntrants(
  currentAggregate: TournamentAggregate,
  newEntrants: Entrant[]
): InvalidationPreview {
  const { tournament, matches: oldMatches } = currentAggregate;

  // Generate new desired match structure
  let desiredMatches: Match[] = [];
  if (tournament.format === 'single_elimination') {
    desiredMatches = generateSingleEliminationMatches(tournament.id, newEntrants, tournament.defaultBestOf);
  } else if (tournament.format === 'double_elimination') {
    desiredMatches = generateDoubleEliminationMatches(tournament.id, newEntrants, tournament.defaultBestOf);
  } else if (tournament.format === 'round_robin') {
    desiredMatches = generateRoundRobinMatches(tournament.id, newEntrants, tournament.defaultBestOf);
  }

  const oldMatchMap = new Map<string, Match>(oldMatches.map((m) => [m.id, m]));
  const desiredMap = new Map<string, Match>(desiredMatches.map((m) => [m.id, m]));
  const invalidatedMatchIds: string[] = [];

  // Sort matches by side and round (topological order)
  const sideOrder: Record<string, number> = { winners: 1, losers: 2, grand_final: 3, round_robin: 1 };
  const sortedMatches = [...desiredMatches].sort((a, b) => {
    const sideDiff = (sideOrder[a.side] || 1) - (sideOrder[b.side] || 1);
    if (sideDiff !== 0) return sideDiff;
    return a.round - b.round;
  });

  for (const desired of sortedMatches) {
    const old = oldMatchMap.get(desired.id);
    if (!old) continue;

    // Retain private notes if match exists
    desired.privateNote = old.privateNote;

    // Check if participant IDs and sources are identical
    const sameEntrants =
      desired.entrantAId === old.entrantAId && desired.entrantBId === old.entrantBId;
    const sameSources =
      JSON.stringify(desired.sourceA) === JSON.stringify(old.sourceA) &&
      JSON.stringify(desired.sourceB) === JSON.stringify(old.sourceB);
    const sameBestOf = desired.bestOf === old.bestOf;

    if (sameEntrants && sameSources && sameBestOf && old.state === 'completed') {
      // Preserve result
      desired.scoreA = old.scoreA;
      desired.scoreB = old.scoreB;
      desired.winnerId = old.winnerId;
      desired.state = 'completed';

      // Propagate outputs into descendant matches in desiredMap
      const loserId = old.winnerId ? (old.winnerId === old.entrantAId ? old.entrantBId : old.entrantAId) : null;
      propagatePreservedOutputs(desiredMap, desired.id, old.winnerId, loserId);
    } else if (old.state === 'completed') {
      // Result cleared!
      invalidatedMatchIds.push(desired.id);
    } else if (old.state === 'draft' && sameEntrants) {
      desired.scoreA = old.scoreA;
      desired.scoreB = old.scoreB;
      desired.state = 'draft';
    }
  }

  return {
    desiredAggregate: {
      ...currentAggregate,
      entrants: newEntrants,
      matches: desiredMatches,
    },
    invalidatedMatchIds,
  };
}

function propagatePreservedOutputs(
  desiredMap: Map<string, Match>,
  matchId: string,
  winnerId: string | null,
  loserId: string | null
) {
  for (const match of desiredMap.values()) {
    if (match.sourceA.type === 'match_winner' && match.sourceA.matchId === matchId) {
      match.entrantAId = winnerId;
    } else if (match.sourceA.type === 'match_loser' && match.sourceA.matchId === matchId) {
      match.entrantAId = loserId;
    }
    if (match.sourceB.type === 'match_winner' && match.sourceB.matchId === matchId) {
      match.entrantBId = winnerId;
    } else if (match.sourceB.type === 'match_loser' && match.sourceB.matchId === matchId) {
      match.entrantBId = loserId;
    }
  }
}
