import { D1Database } from '@cloudflare/workers-types';
import { TournamentAggregate } from '../../../shared/tournaments/types';

export interface TournamentRow {
  id: string;
  public_id: string;
  admin_token_hash: string;
  state_json: string;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface CreateTournamentParams {
  id: string;
  publicId: string;
  adminTokenHash: string;
  aggregate: TournamentAggregate;
}

export async function createTournamentRecord(
  db: D1Database,
  params: CreateTournamentParams
): Promise<{ version: number; createdAt: string; updatedAt: string }> {
  const now = new Date().toISOString();
  const stateJson = JSON.stringify(params.aggregate);

  await db
    .prepare(
      `INSERT INTO tournaments (id, public_id, admin_token_hash, state_json, version, created_at, updated_at)
       VALUES (?1, ?2, ?3, ?4, 1, ?5, ?5)`
    )
    .bind(params.id, params.publicId, params.adminTokenHash, stateJson, now)
    .run();

  return {
    version: 1,
    createdAt: now,
    updatedAt: now,
  };
}

export class CorruptedStateError extends Error {
  constructor(message = 'Persisted tournament state is corrupted') {
    super(message);
    this.name = 'CorruptedStateError';
  }
}

export async function getTournamentByAdminHash(
  db: D1Database,
  adminTokenHash: string
): Promise<{ record: TournamentRow; aggregate: TournamentAggregate } | null> {
  const row = await db
    .prepare(
      `SELECT id, public_id, admin_token_hash, state_json, version, created_at, updated_at
       FROM tournaments
       WHERE admin_token_hash = ?1`
    )
    .bind(adminTokenHash)
    .first<TournamentRow>();

  if (!row) return null;

  try {
    const aggregate: TournamentAggregate = JSON.parse(row.state_json);
    return { record: row, aggregate };
  } catch {
    throw new CorruptedStateError();
  }
}

export async function getTournamentByPublicId(
  db: D1Database,
  publicId: string
): Promise<{ record: TournamentRow; aggregate: TournamentAggregate } | null> {
  const row = await db
    .prepare(
      `SELECT id, public_id, admin_token_hash, state_json, version, created_at, updated_at
       FROM tournaments
       WHERE public_id = ?1`
    )
    .bind(publicId)
    .first<TournamentRow>();

  if (!row) return null;

  try {
    const aggregate: TournamentAggregate = JSON.parse(row.state_json);
    return { record: row, aggregate };
  } catch {
    throw new CorruptedStateError();
  }
}

export async function updateTournamentAggregate(
  db: D1Database,
  id: string,
  expectedVersion: number,
  newAggregate: TournamentAggregate
): Promise<{ success: boolean; newVersion?: number; updatedAt?: string }> {
  const now = new Date().toISOString();
  const nextAggregate = {
    ...newAggregate,
    tournament: {
      ...newAggregate.tournament,
      version: expectedVersion + 1,
      updatedAt: now,
    },
  };
  const stateJson = JSON.stringify(nextAggregate);

  const result = await db
    .prepare(
      `UPDATE tournaments
       SET state_json = ?1,
           version = version + 1,
           updated_at = ?2
       WHERE id = ?3 AND version = ?4
       RETURNING version, updated_at`
    )
    .bind(stateJson, now, id, expectedVersion)
    .first<{ version: number; updated_at: string }>();

  if (!result) {
    return { success: false };
  }

  return {
    success: true,
    newVersion: result.version,
    updatedAt: result.updated_at,
  };
}
