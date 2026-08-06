import { Entrant, Match } from './types';
import { getStandardSeedPairs, nextPowerOfTwo, generateStableId } from './utils';

export function generateSingleEliminationMatches(
  tournamentId: string,
  entrants: Entrant[],
  defaultBestOf: number
): Match[] {
  const entrantCount = entrants.length;
  const bracketSize = nextPowerOfTwo(entrantCount);
  const totalRounds = Math.log2(bracketSize);
  const seedMap = new Map<number, Entrant>();
  for (const e of entrants) {
    seedMap.set(e.seed, e);
  }

  const matches: Match[] = [];
  const matchMap = new Map<string, Match>();

  // Round 1
  const r1Pairs = getStandardSeedPairs(bracketSize);
  for (let pos = 1; pos <= r1Pairs.length; pos++) {
    const [seedA, seedB] = r1Pairs[pos - 1];
    const entrantA = seedMap.get(seedA) || null;
    const entrantB = seedMap.get(seedB) || null;

    const matchId = generateStableId('match', tournamentId, 'winners', 1, pos);

    let state: Match['state'] = 'ready';
    let winnerId: string | null = null;

    if (entrantA && !entrantB) {
      state = 'bye';
      winnerId = entrantA.id;
    } else if (!entrantA && entrantB) {
      state = 'bye';
      winnerId = entrantB.id;
    } else if (!entrantA && !entrantB) {
      state = 'blocked';
    }

    const match: Match = {
      id: matchId,
      tournamentId,
      side: 'winners',
      round: 1,
      position: pos,
      sourceA: { type: 'seed', seed: seedA },
      sourceB: { type: 'seed', seed: seedB },
      entrantAId: entrantA ? entrantA.id : null,
      entrantBId: entrantB ? entrantB.id : null,
      bestOf: defaultBestOf,
      scoreA: null,
      scoreB: null,
      winnerId,
      state,
      privateNote: null,
    };

    matches.push(match);
    matchMap.set(matchId, match);
  }

  // Subsequent rounds
  for (let round = 2; round <= totalRounds; round++) {
    const numMatches = bracketSize / Math.pow(2, round);
    for (let pos = 1; pos <= numMatches; pos++) {
      const sourceMatchAId = generateStableId('match', tournamentId, 'winners', round - 1, pos * 2 - 1);
      const sourceMatchBId = generateStableId('match', tournamentId, 'winners', round - 1, pos * 2);

      const sourceMatchA = matchMap.get(sourceMatchAId)!;
      const sourceMatchB = matchMap.get(sourceMatchBId)!;

      const entrantAId = sourceMatchA.winnerId;
      const entrantBId = sourceMatchB.winnerId;

      let state: Match['state'] = 'blocked';
      if (entrantAId && entrantBId) {
        state = 'ready';
      }

      const matchId = generateStableId('match', tournamentId, 'winners', round, pos);

      const match: Match = {
        id: matchId,
        tournamentId,
        side: 'winners',
        round,
        position: pos,
        sourceA: { type: 'match_winner', matchId: sourceMatchAId },
        sourceB: { type: 'match_winner', matchId: sourceMatchBId },
        entrantAId,
        entrantBId,
        bestOf: defaultBestOf,
        scoreA: null,
        scoreB: null,
        winnerId: null,
        state,
        privateNote: null,
      };

      matches.push(match);
      matchMap.set(matchId, match);
    }
  }

  return matches;
}
