import { describe, it, expect, beforeEach } from 'vitest';
import { createMockD1Database } from '../mocks/mockD1';
import {
  createTournamentRecord,
  getTournamentByAdminHash,
  getTournamentByPublicId,
  updateTournamentAggregate,
} from '../../functions/_shared/tournaments/repository';
import { TournamentAggregate } from '../../shared/tournaments/types';

describe('D1 Persistence & Concurrency — Phase 3', () => {
  let db: ReturnType<typeof createMockD1Database>;

  const initialAggregate: TournamentAggregate = {
    tournament: {
      id: 't-100',
      name: 'Concurrency Cup',
      format: 'single_elimination',
      entrantType: 'individual',
      status: 'active',
      defaultBestOf: 3,
      version: 1,
      createdAt: '2026-08-06T00:00:00Z',
      updatedAt: '2026-08-06T00:00:00Z',
    },
    entrants: [
      { id: 'e-1', tournamentId: 't-100', seed: 1, name: 'Alice', roster: [] },
      { id: 'e-2', tournamentId: 't-100', seed: 2, name: 'Bob', roster: [] },
    ],
    matches: [],
  };

  beforeEach(() => {
    db = createMockD1Database();
  });

  it('creates and retrieves tournament record by admin hash and public ID', async () => {
    const created = await createTournamentRecord(db, {
      id: 't-100',
      publicId: 'pub_xyz123',
      adminTokenHash: 'hash_secret456',
      aggregate: initialAggregate,
    });

    expect(created.version).toBe(1);

    const adminResult = await getTournamentByAdminHash(db, 'hash_secret456');
    expect(adminResult).not.toBeNull();
    expect(adminResult?.aggregate.tournament.name).toBe('Concurrency Cup');

    const publicResult = await getTournamentByPublicId(db, 'pub_xyz123');
    expect(publicResult).not.toBeNull();
    expect(publicResult?.aggregate.tournament.id).toBe('t-100');
  });

  it('proves single-statement optimistic concurrency rejects stale concurrent writes', async () => {
    await createTournamentRecord(db, {
      id: 't-100',
      publicId: 'pub_xyz123',
      adminTokenHash: 'hash_secret456',
      aggregate: initialAggregate,
    });

    // Client A and Client B both attempt to mutate expectedVersion = 1
    const updateA = updateTournamentAggregate(db, 't-100', 1, {
      ...initialAggregate,
      tournament: { ...initialAggregate.tournament, name: 'Name Updated By A' },
    });

    const updateB = updateTournamentAggregate(db, 't-100', 1, {
      ...initialAggregate,
      tournament: { ...initialAggregate.tournament, name: 'Name Updated By B' },
    });

    const [resA, resB] = await Promise.all([updateA, updateB]);

    // Exactly one write must succeed, and one write must fail with success: false
    const succeeded = [resA, resB].filter((r) => r.success);
    const failed = [resA, resB].filter((r) => !r.success);

    expect(succeeded.length).toBe(1);
    expect(failed.length).toBe(1);
    expect(succeeded[0].newVersion).toBe(2);

    // Verify DB retains state of successful write
    const latest = await getTournamentByAdminHash(db, 'hash_secret456');
    expect(latest?.record.version).toBe(2);
  });
});
