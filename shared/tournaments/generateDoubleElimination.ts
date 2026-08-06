import { Entrant, Match } from './types';
import { generateSingleEliminationMatches } from './generateSingleElimination';
import { nextPowerOfTwo, generateStableId } from './utils';

export function generateDoubleEliminationMatches(
  tournamentId: string,
  entrants: Entrant[],
  defaultBestOf: number
): Match[] {
  const entrantCount = entrants.length;
  const bracketSize = nextPowerOfTwo(entrantCount);

  if (bracketSize === 2) {
    // Special case N=2
    const wbMatches = generateSingleEliminationMatches(tournamentId, entrants, defaultBestOf);
    const wbFinal = wbMatches[0];

    const gfId = generateStableId('match', tournamentId, 'grand_final', 1, 1);
    const gfMatch: Match = {
      id: gfId,
      tournamentId,
      side: 'grand_final',
      round: 1,
      position: 1,
      sourceA: { type: 'match_winner', matchId: wbFinal.id },
      sourceB: { type: 'match_loser', matchId: wbFinal.id },
      entrantAId: wbFinal.winnerId,
      entrantBId: null, // Loser of WB final
      bestOf: defaultBestOf,
      scoreA: null,
      scoreB: null,
      winnerId: null,
      state: 'blocked',
      privateNote: null,
    };

    return [...wbMatches, gfMatch];
  }

  // 1. Generate Winners Bracket
  const wbMatches = generateSingleEliminationMatches(tournamentId, entrants, defaultBestOf);
  const matchMap = new Map<string, Match>();
  for (const m of wbMatches) {
    matchMap.set(m.id, m);
  }

  const wbRounds = Math.log2(bracketSize);
  const lbRounds = 2 * (wbRounds - 1);
  const lbMatches: Match[] = [];

  // Helper to retrieve WB match ID by round and position
  const getWbId = (r: number, p: number) => generateStableId('match', tournamentId, 'winners', r, p);
  // Helper to retrieve LB match ID by round and position
  const getLbId = (r: number, p: number) => generateStableId('match', tournamentId, 'losers', r, p);

  // Generate LB Rounds
  for (let lbRound = 1; lbRound <= lbRounds; lbRound++) {
    // Calculate number of matches in this LB round
    const numMatches = Math.pow(2, Math.floor((lbRounds - lbRound) / 2));

    for (let pos = 1; pos <= numMatches; pos++) {
      const matchId = getLbId(lbRound, pos);

      let sourceA: Match['sourceA'];
      let sourceB: Match['sourceB'];

      if (lbRound === 1) {
        // LB R1: Losers from WB R1
        sourceA = { type: 'match_loser', matchId: getWbId(1, pos * 2 - 1) };
        sourceB = { type: 'match_loser', matchId: getWbId(1, pos * 2) };
      } else if (lbRound % 2 === 1) {
        // Odd LB Round (3, 5, 7): Winners from previous LB round
        sourceA = { type: 'match_winner', matchId: getLbId(lbRound - 1, pos * 2 - 1) };
        sourceB = { type: 'match_winner', matchId: getLbId(lbRound - 1, pos * 2) };
      } else {
        // Even LB Round (2, 4, 6, 8): Winner from prev LB round + Loser from WB round (lbRound / 2 + 1)
        const wbDropRound = lbRound / 2 + 1;
        // Invert WB drop position to prevent immediate rematches
        const wbDropPos = numMatches - pos + 1;

        sourceA = { type: 'match_winner', matchId: getLbId(lbRound - 1, pos) };
        sourceB = { type: 'match_loser', matchId: getWbId(wbDropRound, wbDropPos) };
      }

      // Resolve current entrants and source resolution state
      const matchA = matchMap.get(sourceA.matchId);
      const matchB = matchMap.get(sourceB.matchId);

      const resolvedA = sourceA.type === 'match_winner'
        ? Boolean(matchA && matchA.winnerId !== null)
        : Boolean(matchA && (matchA.state === 'completed' || matchA.state === 'bye'));

      const resolvedB = sourceB.type === 'match_winner'
        ? Boolean(matchB && matchB.winnerId !== null)
        : Boolean(matchB && (matchB.state === 'completed' || matchB.state === 'bye'));

      let entrantAId: string | null = null;
      let entrantBId: string | null = null;

      if (sourceA.type === 'match_winner' && matchA) {
        entrantAId = matchA.winnerId;
      } else if (sourceA.type === 'match_loser' && matchA && (matchA.state === 'completed' || matchA.state === 'bye')) {
        entrantAId = matchA.winnerId ? (matchA.winnerId === matchA.entrantAId ? matchA.entrantBId : matchA.entrantAId) : null;
      }

      if (sourceB.type === 'match_winner' && matchB) {
        entrantBId = matchB.winnerId;
      } else if (sourceB.type === 'match_loser' && matchB && (matchB.state === 'completed' || matchB.state === 'bye')) {
        entrantBId = matchB.winnerId ? (matchB.winnerId === matchB.entrantAId ? matchB.entrantBId : matchB.entrantAId) : null;
      }

      let state: Match['state'] = 'blocked';
      let winnerId: string | null = null;

      if (resolvedA && resolvedB) {
        if (entrantAId && entrantBId) {
          state = 'ready';
        } else if (entrantAId || entrantBId) {
          state = 'bye';
          winnerId = entrantAId || entrantBId;
        } else {
          state = 'bye';
        }
      }

      const lbMatch: Match = {
        id: matchId,
        tournamentId,
        side: 'losers',
        round: lbRound,
        position: pos,
        sourceA,
        sourceB,
        entrantAId,
        entrantBId,
        bestOf: defaultBestOf,
        scoreA: null,
        scoreB: null,
        winnerId,
        state,
        privateNote: null,
      };

      lbMatches.push(lbMatch);
      matchMap.set(matchId, lbMatch);
    }
  }

  // Grand Final
  const wbFinalId = getWbId(wbRounds, 1);
  const lbFinalId = getLbId(lbRounds, 1);

  const gfMatch: Match = {
    id: generateStableId('match', tournamentId, 'grand_final', 1, 1),
    tournamentId,
    side: 'grand_final',
    round: 1,
    position: 1,
    sourceA: { type: 'match_winner', matchId: wbFinalId },
    sourceB: { type: 'match_winner', matchId: lbFinalId },
    entrantAId: matchMap.get(wbFinalId)?.winnerId || null,
    entrantBId: matchMap.get(lbFinalId)?.winnerId || null,
    bestOf: defaultBestOf,
    scoreA: null,
    scoreB: null,
    winnerId: null,
    state: 'blocked',
    privateNote: null,
  };

  return [...wbMatches, ...lbMatches, gfMatch];
}
