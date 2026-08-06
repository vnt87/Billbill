import { describe, it, expect, beforeEach } from 'vitest';
import { createMockD1Database } from '../mocks/mockD1';
import {
  createTournamentService,
  getAdminTournamentService,
  getPublicTournamentService,
  updateMatchService,
  updateTournamentService,
} from '../../functions/_shared/tournaments/service';

describe('Tournament Service & API Integration — Phase 4 & 5', () => {
  let db: ReturnType<typeof createMockD1Database>;

  beforeEach(() => {
    db = createMockD1Database();
  });

  it('creates tournament and returns separate admin and public URLs', async () => {
    const res = await createTournamentService(db, {
      name: 'Friday Pool Night',
      format: 'single_elimination',
      entrantType: 'individual',
      defaultBestOf: 3,
      entrants: [
        { name: 'Alice', seed: 1, roster: [] },
        { name: 'Bob', seed: 2, roster: [] },
      ],
    });

    expect('data' in res).toBe(true);
    if ('data' in res) {
      expect(res.data.adminUrl).toMatch(/\/tournaments\/manage\/[A-Za-z0-9_-]+/);
      expect(res.data.publicUrl).toMatch(/\/tournaments\/view\/[A-Za-z0-9_-]+/);
      expect(res.data.tournament.name).toBe('Friday Pool Night');
    }
  });

  it('admin view can complete matches, update version, and spectator view reflects results without private notes', async () => {
    // 1. Create
    const createRes = await createTournamentService(db, {
      name: 'Championship',
      format: 'single_elimination',
      entrantType: 'individual',
      defaultBestOf: 3,
      entrants: [
        { name: 'Alice', seed: 1, roster: [] },
        { name: 'Bob', seed: 2, roster: [] },
      ],
    });

    if ('error' in createRes) throw new Error('Create failed');

    const adminToken = createRes.data.adminUrl.replace('/tournaments/manage/', '');
    const publicToken = createRes.data.publicUrl.replace('/tournaments/view/', '');

    // 2. Admin read
    const adminRead = await getAdminTournamentService(db, adminToken);
    if ('error' in adminRead) throw new Error('Admin read failed');

    const matchId = adminRead.data.aggregate.matches[0].id;

    // 3. Admin match completion
    const matchUpdate = await updateMatchService(db, adminToken, matchId, {
      expectedVersion: 1,
      command: { type: 'completeResult', scoreA: 2, scoreB: 0 },
    });

    expect('data' in matchUpdate).toBe(true);
    if ('data' in matchUpdate) {
      expect(matchUpdate.version).toBe(2);
      expect(matchUpdate.data.aggregate.matches[0].state).toBe('completed');
    }

    // 4. Admin private note
    await updateMatchService(db, adminToken, matchId, {
      expectedVersion: 2,
      command: { type: 'updatePrivateNote', note: 'Secret table note: table 4' },
    });

    // 5. Spectator read
    const publicRead = await getPublicTournamentService(db, publicToken);
    expect('data' in publicRead).toBe(true);

    if ('data' in publicRead) {
      const json = JSON.stringify(publicRead.data);
      expect(json).not.toContain('Secret table note');
      expect(json).not.toContain('adminToken');
      expect(publicRead.data.matches[0].scoreA).toBe(2);
      expect(publicRead.data.matches[0].scoreB).toBe(0);
    }
  });

  it('requires explicit invalidation confirmation before updating entrants if results would be cleared', async () => {
    const createRes = await createTournamentService(db, {
      name: 'Invalidation Cup',
      format: 'single_elimination',
      entrantType: 'individual',
      defaultBestOf: 3,
      entrants: [
        { name: 'Alice', seed: 1, roster: [] },
        { name: 'Bob', seed: 2, roster: [] },
        { name: 'Charlie', seed: 3, roster: [] },
        { name: 'Dave', seed: 4, roster: [] },
      ],
    });

    if ('error' in createRes) throw new Error('Create failed');
    const adminToken = createRes.data.adminUrl.replace('/tournaments/manage/', '');

    const adminRead = await getAdminTournamentService(db, adminToken);
    if ('error' in adminRead) throw new Error('Admin read failed');

    const match0 = adminRead.data.aggregate.matches[0];
    const entrants = adminRead.data.aggregate.entrants;

    // Complete match 0
    await updateMatchService(db, adminToken, match0.id, {
      expectedVersion: 1,
      command: { type: 'completeResult', scoreA: 2, scoreB: 0 },
    });

    // Try seed swap without confirmInvalidation -> should return 422 INVALIDATION_CONFIRMATION_REQUIRED
    const swappedInput = [
      { name: entrants[0].name, seed: 1, roster: [] },
      { name: entrants[1].name, seed: 4, roster: [] },
      { name: entrants[2].name, seed: 3, roster: [] },
      { name: entrants[3].name, seed: 2, roster: [] },
    ];

    const unconfirmedRes = await updateTournamentService(db, adminToken, {
      expectedVersion: 2,
      command: { type: 'updateEntrants', entrants: swappedInput },
    });

    expect('error' in unconfirmedRes).toBe(true);
    if ('error' in unconfirmedRes) {
      expect(unconfirmedRes.error.code).toBe('INVALIDATION_CONFIRMATION_REQUIRED');
    }

    // Now send with confirmInvalidation
    const confirmedRes = await updateTournamentService(db, adminToken, {
      expectedVersion: 2,
      command: { type: 'updateEntrants', entrants: swappedInput },
      confirmInvalidation: [match0.id],
    });

    expect('data' in confirmedRes).toBe(true);
    if ('data' in confirmedRes) {
      expect(confirmedRes.version).toBe(3);
    }
  });
});
