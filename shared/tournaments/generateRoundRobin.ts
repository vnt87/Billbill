import { Entrant, Match } from './types';
import { generateStableId } from './utils';

export function generateRoundRobinMatches(
  tournamentId: string,
  entrants: Entrant[],
  defaultBestOf: number
): Match[] {
  const sortedEntrants = [...entrants].sort((a, b) => a.seed - b.seed);
  const n = sortedEntrants.length;
  const isOdd = n % 2 !== 0;

  // Use entrant array or add sentinel BYE if odd
  const list: Array<Entrant | null> = [...sortedEntrants];
  if (isOdd) {
    list.push(null);
  }

  const numEntrants = list.length;
  const numRounds = numEntrants - 1;
  const matchesPerRound = numEntrants / 2;

  const matches: Match[] = [];

  for (let round = 1; round <= numRounds; round++) {
    let position = 1;
    for (let i = 0; i < matchesPerRound; i++) {
      const entrantA = list[i];
      const entrantB = list[numEntrants - 1 - i];

      // Omit BYE pairings
      if (entrantA && entrantB) {
        const matchId = generateStableId('match', tournamentId, 'round_robin', round, position);
        const match: Match = {
          id: matchId,
          tournamentId,
          side: 'round_robin',
          round,
          position,
          sourceA: { type: 'seed', seed: entrantA.seed },
          sourceB: { type: 'seed', seed: entrantB.seed },
          entrantAId: entrantA.id,
          entrantBId: entrantB.id,
          bestOf: defaultBestOf,
          scoreA: null,
          scoreB: null,
          winnerId: null,
          state: 'ready',
          privateNote: null,
        };
        matches.push(match);
        position++;
      }
    }

    // Rotate elements for circle method: keep list[0] fixed, rotate the rest clockwise
    const last = list.pop()!;
    list.splice(1, 0, last);
  }

  return matches;
}
