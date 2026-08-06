import { D1Database } from '@cloudflare/workers-types';
import { TournamentAggregate, TournamentFormat, TournamentStatus } from '../../../shared/tournaments/types';

export interface TournamentRow {
  id: string;
  public_id: string;
  admin_token_hash: string;
  management_passphrase_hash?: string | null;
  management_token_hash?: string | null;
  state_json: string;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface CreateTournamentParams {
  id: string;
  public_id?: string;
  publicId?: string;
  admin_token_hash?: string;
  adminTokenHash?: string;
  management_passphrase_hash?: string | null;
  managementPassphraseHash?: string | null;
  management_token_hash?: string | null;
  managementTokenHash?: string | null;
  aggregate: TournamentAggregate;
}

export async function createTournamentRecord(
  db: D1Database,
  params: CreateTournamentParams
): Promise<{ version: number; createdAt: string; updatedAt: string }> {
  const now = new Date().toISOString();
  const stateJson = JSON.stringify(params.aggregate);
  const publicId = params.publicId || params.public_id || '';
  const adminTokenHash = params.adminTokenHash || params.admin_token_hash || '';
  const passphraseHash = params.managementPassphraseHash ?? params.management_passphrase_hash ?? null;
  const managementTokenHash = params.managementTokenHash ?? params.management_token_hash ?? null;

  await db
    .prepare(
      `INSERT INTO tournaments (id, public_id, admin_token_hash, management_passphrase_hash, management_token_hash, state_json, version, created_at, updated_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, 1, ?7, ?7)`
    )
    .bind(params.id, publicId, adminTokenHash, passphraseHash, managementTokenHash, stateJson, now)
    .run();

  return {
    version: 1,
    createdAt: now,
    updatedAt: now,
  };
}

export interface TournamentSummaryRow {
  id: string;
  public_id: string;
  name: string;
  format: TournamentFormat;
  status: TournamentStatus;
  created_at: string;
  updated_at: string;
}

export async function listTournamentRecords(
  db: D1Database,
  cursorUpdatedAt?: string,
  cursorId?: string,
  limit = 50
): Promise<TournamentSummaryRow[]> {
  const boundedLimit = Math.min(Math.max(1, limit), 100);
  if (cursorUpdatedAt && cursorId) {
    const result = await db.prepare(
      `SELECT id, public_id,
              json_extract(state_json, '$.tournament.name') AS name,
              json_extract(state_json, '$.tournament.format') AS format,
              json_extract(state_json, '$.tournament.status') AS status,
              created_at, updated_at
       FROM tournaments
       WHERE updated_at < ?1 OR (updated_at = ?1 AND id < ?2)
       ORDER BY updated_at DESC, id DESC
       LIMIT ?3`
    ).bind(cursorUpdatedAt, cursorId, boundedLimit).all<TournamentSummaryRow>();
    return result.results || [];
  } else {
    const result = await db.prepare(
      `SELECT id, public_id,
              json_extract(state_json, '$.tournament.name') AS name,
              json_extract(state_json, '$.tournament.format') AS format,
              json_extract(state_json, '$.tournament.status') AS status,
              created_at, updated_at
       FROM tournaments
       ORDER BY updated_at DESC, id DESC
       LIMIT ?1`
    ).bind(boundedLimit).all<TournamentSummaryRow>();
    return result.results || [];
  }
}

export async function setTournamentAccess(
  db: D1Database,
  id: string,
  passphraseHash: string,
  managementTokenHash: string
): Promise<boolean> {
  const result = await db.prepare(
    `UPDATE tournaments SET management_passphrase_hash = ?1, management_token_hash = ?2 WHERE id = ?3`
  ).bind(passphraseHash, managementTokenHash, id).run();
  return Boolean(result.success);
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
      `SELECT id, public_id, admin_token_hash, management_passphrase_hash, management_token_hash, state_json, version, created_at, updated_at
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

export async function getTournamentByManagementHash(
  db: D1Database,
  managementTokenHash: string
): Promise<{ record: TournamentRow; aggregate: TournamentAggregate } | null> {
  const row = await db.prepare(
    `SELECT id, public_id, admin_token_hash, management_passphrase_hash, management_token_hash, state_json, version, created_at, updated_at
     FROM tournaments WHERE management_token_hash = ?1`
  ).bind(managementTokenHash).first<TournamentRow>();
  if (!row) return null;
  try {
    return { record: row, aggregate: JSON.parse(row.state_json) as TournamentAggregate };
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
      `SELECT id, public_id, admin_token_hash, management_passphrase_hash, management_token_hash, state_json, version, created_at, updated_at
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

export async function deleteTournamentRecord(
  db: D1Database,
  id: string,
  expectedVersion: number
): Promise<boolean> {
  const result = await db.prepare(`DELETE FROM tournaments WHERE id = ?1 AND version = ?2`).bind(id, expectedVersion).run();
  return Boolean(result.success);
}
