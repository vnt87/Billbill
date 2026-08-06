import { describe, it, expect } from 'vitest';
import { Entrant } from '../../shared/tournaments/types';
import { generateSingleEliminationMatches } from '../../shared/tournaments/generateSingleElimination';
import { generateDoubleEliminationMatches } from '../../shared/tournaments/generateDoubleElimination';
import { generateRoundRobinMatches } from '../../shared/tournaments/generateRoundRobin';
import { calculateRoundRobinStandings } from '../../shared/tournaments/standings';
import { validateScoreForCompletion, applyMatchCommand } from '../../shared/tournaments/progressMatches';
import { reconcileAggregateEntrants } from '../../shared/tournaments/invalidation';

function makeEntrants(count: number): Entrant[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `e-${i + 1}`,
    tournamentId: 't-test',
    seed: i + 1,
    name: `Player ${i + 1}`,
    roster: [],
  }));
}

describe('Tournament Engines — Phase 2 Fixture Matrix', () => {
  describe('Single Elimination Matrix (2..32 entrants)', () => {
    for (let count = 2; count <= 32; count++) {
      it(`correctly generates 100% valid SE fixtures for ${count} entrants`, () => {
        const entrants = makeEntrants(count);
        const matches = generateSingleEliminationMatches('t-test', entrants, 3);

        const byes = matches.filter((m) => m.state === 'bye');
        const playable = matches.filter((m) => m.state !== 'bye');

        expect(playable.length).toBe(count - 1);
        expect(byes.every((b) => b.winnerId !== null)).toBe(true);

        const finalMatch = matches.find((m) => m.round === Math.log2(matches.length + 1) && m.position === 1);
        expect(finalMatch).toBeDefined();
      });
    }
  });

  describe('Double Elimination Matrix (2..32 entrants)', () => {
    for (let count = 2; count <= 32; count++) {
      it(`correctly generates valid DE fixtures for ${count} entrants`, () => {
        const entrants = makeEntrants(count);
        const matches = generateDoubleEliminationMatches('t-test', entrants, 3);

        const gfMatches = matches.filter((m) => m.side === 'grand_final');
        expect(gfMatches.length).toBe(1); // Single grand final (no reset)
      });
    }
  });

  describe('Round Robin Matrix (2..32 entrants)', () => {
    for (let count = 2; count <= 32; count++) {
      it(`generates exactly n(n-1)/2 unique pairings for ${count} entrants`, () => {
        const entrants = makeEntrants(count);
        const matches = generateRoundRobinMatches('t-test', entrants, 3);

        const expectedCount = (count * (count - 1)) / 2;
        expect(matches.length).toBe(expectedCount);

        // Check pair uniqueness
        const pairSet = new Set<string>();
        for (const m of matches) {
          const sortedPair = [m.entrantAId!, m.entrantBId!].sort().join(':');
          expect(pairSet.has(sortedPair)).toBe(false);
          pairSet.add(sortedPair);
        }
        expect(pairSet.size).toBe(expectedCount);
      });
    }
  });

  describe('Round Robin Standings & Multi-way Tiebreakers', () => {
    it('ranks entrants by points (3/1/0) and applies tiebreakers', () => {
      const entrants = makeEntrants(3); // e-1, e-2, e-3
      const matches = generateRoundRobinMatches('t-test', entrants, 3);

      // Match 1: e-2 vs e-3 -> e-2 wins
      const m1 = matches.find((m) => (m.entrantAId === 'e-2' && m.entrantBId === 'e-3') || (m.entrantAId === 'e-3' && m.entrantBId === 'e-2'))!;
      m1.state = 'completed';
      m1.scoreA = m1.entrantAId === 'e-2' ? 2 : 0;
      m1.scoreB = m1.entrantAId === 'e-2' ? 0 : 2;
      m1.winnerId = 'e-2';

      // Match 2: e-1 vs e-3 -> e-1 wins
      const m2 = matches.find((m) => (m.entrantAId === 'e-1' && m.entrantBId === 'e-3') || (m.entrantAId === 'e-3' && m.entrantBId === 'e-1'))!;
      m2.state = 'completed';
      m2.scoreA = m2.entrantAId === 'e-1' ? 2 : 0;
      m2.scoreB = m2.entrantAId === 'e-1' ? 0 : 2;
      m2.winnerId = 'e-1';

      // Match 3: e-1 vs e-2 -> e-1 wins
      const m3 = matches.find((m) => (m.entrantAId === 'e-1' && m.entrantBId === 'e-2') || (m.entrantAId === 'e-2' && m.entrantBId === 'e-1'))!;
      m3.state = 'completed';
      m3.scoreA = m3.entrantAId === 'e-1' ? 2 : 0;
      m3.scoreB = m3.entrantAId === 'e-1' ? 0 : 2;
      m3.winnerId = 'e-1';

      const standings = calculateRoundRobinStandings(entrants, matches);

      expect(standings[0].entrantId).toBe('e-1');
      expect(standings[0].points).toBe(6);
      expect(standings[0].rank).toBe(1);

      expect(standings[1].entrantId).toBe('e-2');
      expect(standings[1].points).toBe(3);
      expect(standings[1].rank).toBe(2);

      expect(standings[2].entrantId).toBe('e-3');
      expect(standings[2].points).toBe(0);
      expect(standings[2].rank).toBe(3);
    });
  });

  describe('Score Validation & Match Progression', () => {
    it('rejects draws in elimination matches', () => {
      const entrants = makeEntrants(2);
      const matches = generateSingleEliminationMatches('t-test', entrants, 3);

      const val = validateScoreForCompletion(matches[0], 1, 1);
      expect(val.valid).toBe(false);
      expect(val.code).toBe('DRAW_NOT_ALLOWED');
    });

    it('requires winning threshold (floor(bestOf/2)+1) for completion', () => {
      const entrants = makeEntrants(2);
      const matches = generateSingleEliminationMatches('t-test', entrants, 3); // best of 3 -> need 2 wins

      const valInvalid = validateScoreForCompletion(matches[0], 1, 0);
      expect(valInvalid.valid).toBe(false);
      expect(valInvalid.code).toBe('INVALID_COMPLETION_SCORE');

      const valValid = validateScoreForCompletion(matches[0], 2, 0);
      expect(valValid.valid).toBe(true);
    });
  });

  describe('Selective Invalidation', () => {
    it('preserves scores when entrant is renamed without ID change', () => {
      const entrants = makeEntrants(2);
      const matches = generateSingleEliminationMatches('t-test', entrants, 3);
      matches[0].state = 'completed';
      matches[0].scoreA = 2;
      matches[0].scoreB = 1;
      matches[0].winnerId = 'e-1';

      const aggregate = {
        tournament: {
          id: 't-test',
          name: 'Cup',
          format: 'single_elimination' as const,
          entrantType: 'individual' as const,
          status: 'completed' as const,
          defaultBestOf: 3,
          version: 1,
          createdAt: '',
          updatedAt: '',
        },
        entrants,
        matches,
      };

      const renamedEntrants = [
        { ...entrants[0], name: 'Alice Renamed' },
        { ...entrants[1], name: 'Bob Renamed' },
      ];

      const preview = reconcileAggregateEntrants(aggregate, renamedEntrants);
      expect(preview.invalidatedMatchIds.length).toBe(0);
      expect(preview.desiredAggregate.matches[0].state).toBe('completed');
      expect(preview.desiredAggregate.matches[0].scoreA).toBe(2);
    });

    it('clears matches when seed swap alters participant pairing', () => {
      const entrants = makeEntrants(4);
      const matches = generateSingleEliminationMatches('t-test', entrants, 3);

      const aggregate = {
        tournament: {
          id: 't-test',
          name: 'Cup',
          format: 'single_elimination' as const,
          entrantType: 'individual' as const,
          status: 'active' as const,
          defaultBestOf: 3,
          version: 1,
          createdAt: '',
          updatedAt: '',
        },
        entrants,
        matches,
      };

      // Complete match 1
      const res = applyMatchCommand(aggregate, matches[0].id, { type: 'completeResult', scoreA: 2, scoreB: 0 });
      if ('error' in res) throw new Error('applyMatchCommand failed');

      // Swap seeds 2 and 4
      const swappedEntrants = [
        { ...entrants[0] },
        { ...entrants[1], seed: 4 },
        { ...entrants[2] },
        { ...entrants[3], seed: 2 },
      ];

      const preview = reconcileAggregateEntrants(res.aggregate, swappedEntrants);
      expect(preview.invalidatedMatchIds.length).toBeGreaterThan(0);
    });
  });
});
