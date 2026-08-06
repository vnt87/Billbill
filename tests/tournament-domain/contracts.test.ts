import { describe, it, expect } from 'vitest';
import { TournamentAggregate } from '../../shared/tournaments/types';
import { validateCreateTournamentInput } from '../../shared/tournaments/validation';
import { toPublicDto } from '../../shared/tournaments/serializers';

describe('Tournament Domain Contracts & Validation', () => {
  it('rejects empty tournament names', () => {
    const res = validateCreateTournamentInput({
      name: '   ',
      format: 'single_elimination',
      entrantType: 'individual',
      defaultBestOf: 3,
      entrants: [
        { name: 'Player 1', seed: 1, roster: [] },
        { name: 'Player 2', seed: 2, roster: [] },
      ],
    });
    expect(res.valid).toBe(false);
    expect(res.code).toBe('TOURNAMENT_NAME_REQUIRED');
  });

  it('rejects invalid best-of numbers', () => {
    const res = validateCreateTournamentInput({
      name: 'Valid Cup',
      format: 'single_elimination',
      entrantType: 'individual',
      defaultBestOf: 4, // Must be odd 1-15
      entrants: [
        { name: 'Player 1', seed: 1, roster: [] },
        { name: 'Player 2', seed: 2, roster: [] },
      ],
    });
    expect(res.valid).toBe(false);
    expect(res.code).toBe('INVALID_BEST_OF');
  });

  it('rejects entrant count out of bounds (<2 or >32)', () => {
    const resUnder = validateCreateTournamentInput({
      name: 'Valid Cup',
      format: 'single_elimination',
      entrantType: 'individual',
      defaultBestOf: 3,
      entrants: [{ name: 'Player 1', seed: 1, roster: [] }],
    });
    expect(resUnder.valid).toBe(false);
    expect(resUnder.code).toBe('ENTRANT_COUNT_OUT_OF_RANGE');

    const resOver = validateCreateTournamentInput({
      name: 'Valid Cup',
      format: 'single_elimination',
      entrantType: 'individual',
      defaultBestOf: 3,
      entrants: Array.from({ length: 33 }, (_, i) => ({ name: `Player ${i + 1}`, seed: i + 1, roster: [] })),
    });
    expect(resOver.valid).toBe(false);
    expect(resOver.code).toBe('ENTRANT_COUNT_OUT_OF_RANGE');
  });

  it('requires team roster for team entrant types', () => {
    const res = validateCreateTournamentInput({
      name: 'Team Cup',
      format: 'single_elimination',
      entrantType: 'team',
      defaultBestOf: 3,
      entrants: [
        { name: 'Team Alpha', seed: 1, roster: [] }, // Empty roster!
        { name: 'Team Beta', seed: 2, roster: ['Bob'] },
      ],
    });
    expect(res.valid).toBe(false);
    expect(res.code).toBe('TEAM_ROSTER_REQUIRED');
  });

  it('proves toPublicDto recursively removes private notes and tokens', () => {
    const mockAggregate: TournamentAggregate = {
      tournament: {
        id: 't-123',
        name: 'Secret Cup',
        format: 'single_elimination',
        entrantType: 'individual',
        status: 'active',
        defaultBestOf: 3,
        version: 2,
        createdAt: '2026-08-06T00:00:00Z',
        updatedAt: '2026-08-06T01:00:00Z',
      },
      entrants: [
        { id: 'e-1', tournamentId: 't-123', seed: 1, name: 'Alice', roster: [] },
        { id: 'e-2', tournamentId: 't-123', seed: 2, name: 'Bob', roster: [] },
      ],
      matches: [
        {
          id: 'm-1',
          tournamentId: 't-123',
          side: 'winners',
          round: 1,
          position: 1,
          sourceA: { type: 'seed', seed: 1 },
          sourceB: { type: 'seed', seed: 2 },
          entrantAId: 'e-1',
          entrantBId: 'e-2',
          bestOf: 3,
          scoreA: 2,
          scoreB: 0,
          winnerId: 'e-1',
          state: 'completed',
          privateNote: 'Organizer secret note: Alice had a great start!',
        },
      ],
    };

    const publicDto = toPublicDto(mockAggregate);
    const jsonString = JSON.stringify(publicDto);

    expect(jsonString).not.toContain('privateNote');
    expect(jsonString).not.toContain('Organizer secret note');
    expect(jsonString).not.toContain('adminToken');
    expect(jsonString).not.toContain('admin_token_hash');
    expect(publicDto.matches[0]).not.toHaveProperty('privateNote');
  });
});
