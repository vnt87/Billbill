import { TournamentAggregate, Match } from './types';
import { MatchCommand, ApiError, ApiErrorCode } from './contracts';

export interface ProgressResult {
  aggregate: TournamentAggregate;
  invalidatedMatchIds: string[];
}

export function validateScoreForCompletion(
  match: Match,
  scoreA: number,
  scoreB: number
): { valid: boolean; code?: ApiErrorCode; message?: string } {
  if (scoreA < 0 || scoreB < 0 || !Number.isInteger(scoreA) || !Number.isInteger(scoreB)) {
    return { valid: false, code: 'INVALID_COMPLETION_SCORE', message: 'Scores must be non-negative integers' };
  }

  const winsNeeded = Math.floor(match.bestOf / 2) + 1;

  if (match.side !== 'round_robin') {
    if (scoreA === scoreB) {
      return { valid: false, code: 'DRAW_NOT_ALLOWED', message: 'Draws are not allowed in elimination matches' };
    }
    if (Math.max(scoreA, scoreB) !== winsNeeded) {
      return {
        valid: false,
        code: 'INVALID_COMPLETION_SCORE',
        message: `Match winner must win exactly ${winsNeeded} games in a best-of-${match.bestOf}`,
      };
    }
    if (Math.min(scoreA, scoreB) >= winsNeeded) {
      return { valid: false, code: 'INVALID_COMPLETION_SCORE', message: 'Loser cannot reach winning game threshold' };
    }
  } else {
    // Round robin
    if (scoreA !== scoreB) {
      if (Math.max(scoreA, scoreB) !== winsNeeded) {
        return {
          valid: false,
          code: 'INVALID_COMPLETION_SCORE',
          message: `Match winner must win exactly ${winsNeeded} games in a best-of-${match.bestOf}`,
        };
      }
    }
  }

  return { valid: true };
}

export function applyMatchCommand(
  aggregate: TournamentAggregate,
  matchId: string,
  command: MatchCommand
): { aggregate: TournamentAggregate; invalidatedMatchIds: string[] } | ApiError {
  const matchMap = new Map<string, Match>(aggregate.matches.map((m) => [m.id, { ...m }]));
  const targetMatch = matchMap.get(matchId);

  if (!targetMatch) {
    return { error: { code: 'TOURNAMENT_NOT_FOUND', message: `Match ${matchId} not found` } };
  }

  const invalidatedMatchIds: string[] = [];

  switch (command.type) {
    case 'saveDraftScore': {
      targetMatch.scoreA = command.scoreA;
      targetMatch.scoreB = command.scoreB;
      targetMatch.state = 'draft';
      break;
    }
    case 'updatePrivateNote': {
      targetMatch.privateNote = command.note;
      break;
    }
    case 'overrideBestOf': {
      const oldBestOf = targetMatch.bestOf;
      const newBestOf = command.bestOf;
      targetMatch.bestOf = newBestOf;

      if (oldBestOf !== newBestOf && targetMatch.state === 'completed') {
        // Changing best-of on completed match clears completion
        targetMatch.state = targetMatch.entrantAId && targetMatch.entrantBId ? 'ready' : 'blocked';
        targetMatch.scoreA = null;
        targetMatch.scoreB = null;
        targetMatch.winnerId = null;
        invalidatedMatchIds.push(targetMatch.id);
      } else if (targetMatch.state === 'draft') {
        const winsNeeded = Math.floor(newBestOf / 2) + 1;
        if (
          (targetMatch.scoreA !== null && targetMatch.scoreA > winsNeeded) ||
          (targetMatch.scoreB !== null && targetMatch.scoreB > winsNeeded)
        ) {
          targetMatch.scoreA = null;
          targetMatch.scoreB = null;
        }
      }
      break;
    }
    case 'clearResult': {
      if (targetMatch.state === 'completed') {
        targetMatch.state = targetMatch.entrantAId && targetMatch.entrantBId ? 'ready' : 'blocked';
        targetMatch.scoreA = null;
        targetMatch.scoreB = null;
        targetMatch.winnerId = null;
        invalidatedMatchIds.push(targetMatch.id);
      }
      break;
    }
    case 'completeResult': {
      if (targetMatch.state === 'blocked' || !targetMatch.entrantAId || !targetMatch.entrantBId) {
        return { error: { code: 'MATCH_NOT_READY', message: 'Cannot complete a match before both entrants are resolved' } };
      }

      const val = validateScoreForCompletion(targetMatch, command.scoreA, command.scoreB);
      if (!val.valid) {
        return { error: { code: val.code!, message: val.message! } };
      }

      let winnerId: string | null = null;
      if (command.scoreA > command.scoreB) {
        winnerId = targetMatch.entrantAId;
      } else if (command.scoreB > command.scoreA) {
        winnerId = targetMatch.entrantBId;
      } else if (command.winnerId) {
        winnerId = command.winnerId;
      }

      targetMatch.scoreA = command.scoreA;
      targetMatch.scoreB = command.scoreB;
      targetMatch.winnerId = winnerId;
      targetMatch.state = 'completed';
      break;
    }
  }

  // Propagate downstream winner/loser outputs in the match DAG
  propagateMatchOutputs(matchMap, targetMatch.id, invalidatedMatchIds);

  const updatedMatches = Array.from(matchMap.values());
  const allCompleted = updatedMatches.every((m) => m.state === 'completed' || m.state === 'bye');
  const status = allCompleted ? 'completed' : 'active';

  return {
    aggregate: {
      ...aggregate,
      tournament: {
        ...aggregate.tournament,
        status,
      },
      matches: updatedMatches,
    },
    invalidatedMatchIds,
  };
}

function propagateMatchOutputs(matchMap: Map<string, Match>, startMatchId: string, invalidated: string[]) {
  const queue = [startMatchId];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    if (visited.has(currentId)) continue;
    visited.add(currentId);

    const currentMatch = matchMap.get(currentId)!;

    // Find descendant matches that take output from currentMatch
    for (const match of matchMap.values()) {
      let changed = false;

      // Source A
      if (match.sourceA.type === 'match_winner' && match.sourceA.matchId === currentId) {
        const newEntrantA = currentMatch.winnerId;
        if (match.entrantAId !== newEntrantA) {
          match.entrantAId = newEntrantA;
          changed = true;
        }
      } else if (match.sourceA.type === 'match_loser' && match.sourceA.matchId === currentId) {
        const newEntrantA = getMatchLoserId(currentMatch);
        if (match.entrantAId !== newEntrantA) {
          match.entrantAId = newEntrantA;
          changed = true;
        }
      }

      // Source B
      if (match.sourceB.type === 'match_winner' && match.sourceB.matchId === currentId) {
        const newEntrantB = currentMatch.winnerId;
        if (match.entrantBId !== newEntrantB) {
          match.entrantBId = newEntrantB;
          changed = true;
        }
      } else if (match.sourceB.type === 'match_loser' && match.sourceB.matchId === currentId) {
        const newEntrantB = getMatchLoserId(currentMatch);
        if (match.entrantBId !== newEntrantB) {
          match.entrantBId = newEntrantB;
          changed = true;
        }
      }

      if (changed) {
        if (match.state === 'completed') {
          match.state = match.entrantAId && match.entrantBId ? 'ready' : 'blocked';
          match.scoreA = null;
          match.scoreB = null;
          match.winnerId = null;
          invalidated.push(match.id);
        } else {
          match.state = match.entrantAId && match.entrantBId ? 'ready' : 'blocked';
        }
        queue.push(match.id);
      }
    }
  }
}

function getMatchLoserId(match: Match): string | null {
  if (match.state !== 'completed' || !match.winnerId) return null;
  if (!match.entrantAId || !match.entrantBId) return null;
  return match.winnerId === match.entrantAId ? match.entrantBId : match.entrantAId;
}
