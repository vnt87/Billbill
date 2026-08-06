import { D1Database } from '@cloudflare/workers-types';
import {
  CreateTournamentInput,
  AdminTournamentDto,
  PublicTournamentDto,
  UpdateTournamentRequest,
  MatchMutationRequest,
  ApiError,
  TournamentListDto,
  TournamentAccessResponse,
  CreateTournamentResponseData,
  TournamentSummary,
} from '../../../shared/tournaments/contracts';
import { TournamentAggregate, Entrant, Match } from '../../../shared/tournaments/types';
import { validateManagementPassphrase, validateEntrantsList } from '../../../shared/tournaments/validation';
import { generateCapabilities, generateManagementToken, hashAdminToken, hashPassphrase, verifyPassphrase } from './access';
import {
  createTournamentRecord,
  getTournamentByAdminHash,
  getTournamentByPublicId,
  getTournamentByManagementHash,
  listTournamentRecords,
  setTournamentAccess,
  updateTournamentAggregate,
  deleteTournamentRecord,
  CorruptedStateError,
} from './repository';
import { generateSingleEliminationMatches } from '../../../shared/tournaments/generateSingleElimination';
import { generateDoubleEliminationMatches } from '../../../shared/tournaments/generateDoubleElimination';
import { generateRoundRobinMatches } from '../../../shared/tournaments/generateRoundRobin';
import { validateTournamentName } from '../../../shared/tournaments/validation';
import { calculateRoundRobinStandings } from '../../../shared/tournaments/standings';
import { applyMatchCommand } from '../../../shared/tournaments/progressMatches';
import { reconcileAggregateEntrants } from '../../../shared/tournaments/invalidation';
import { toPublicDto } from '../../../shared/tournaments/serializers';

export async function createTournamentService(
  db: D1Database,
  input: CreateTournamentInput
): Promise<{ data: CreateTournamentResponseData & { adminToken: string; publicId: string; managementToken: string }; version: number } | ApiError> {
  const nameVal = validateTournamentName(input.name);
  if (!nameVal.valid) return { error: { code: nameVal.code!, message: nameVal.message! } };

  const entrantsVal = validateEntrantsList(input.entrants, input.entrantType);
  if (!entrantsVal.valid) return { error: { code: entrantsVal.code!, message: entrantsVal.message! } };

  if (input.managementPassphrase) {
    const passphraseVal = validateManagementPassphrase(input.managementPassphrase);
    if (!passphraseVal.valid) return { error: { code: passphraseVal.code!, message: passphraseVal.message! } };
  }

  const caps = await generateCapabilities();
  const managementToken = await generateManagementToken();
  const tournamentId = `t_${caps.publicId.slice(0, 12)}`;

  const entrants: Entrant[] = input.entrants.map((e, idx) => ({
    id: `e_${idx + 1}`,
    tournamentId,
    name: e.name.trim(),
    seed: e.seed,
    roster: e.roster || [],
  }));

  let matches: Match[] = [];
  if (input.format === 'single_elimination') {
    matches = generateSingleEliminationMatches(tournamentId, entrants, input.defaultBestOf);
  } else if (input.format === 'double_elimination') {
    matches = generateDoubleEliminationMatches(tournamentId, entrants, input.defaultBestOf);
  } else if (input.format === 'round_robin') {
    matches = generateRoundRobinMatches(tournamentId, entrants, input.defaultBestOf);
  }

  const aggregate: TournamentAggregate = {
    tournament: {
      id: tournamentId,
      name: input.name.trim(),
      format: input.format,
      entrantType: input.entrantType,
      status: 'active',
      defaultBestOf: input.defaultBestOf,
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    entrants,
    matches,
  };

  const managementPassphraseHash = input.managementPassphrase ? await hashPassphrase(input.managementPassphrase) : null;
  const managementTokenHash = await hashAdminToken(managementToken);

  await createTournamentRecord(db, {
    id: tournamentId,
    public_id: caps.publicId,
    admin_token_hash: caps.adminTokenHash,
    management_passphrase_hash: managementPassphraseHash,
    management_token_hash: managementTokenHash,
    aggregate,
  });

  return {
    data: {
      tournament: aggregate.tournament,
      adminToken: caps.adminToken,
      publicId: caps.publicId,
      managementToken,
      adminUrl: `/tournaments/manage/${managementToken}`,
      publicUrl: `/tournaments/view/${caps.publicId}`,
    },
    version: 1,
  };
}

export async function listTournamentsService(
  db: D1Database,
  cursorUpdatedAt?: string,
  cursorId?: string,
  limit = 50
): Promise<{ data: TournamentListDto; version: number }> {
  const records = await listTournamentRecords(db, cursorUpdatedAt, cursorId, limit);
  const tournaments: TournamentSummary[] = records.map((record) => ({
    id: record.id,
    publicId: record.public_id,
    name: record.name,
    format: record.format,
    status: record.status,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  }));
  return { data: { tournaments }, version: 1 };
}

export async function accessTournamentService(
  db: D1Database,
  publicId: string,
  passphrase: string
): Promise<{ data: TournamentAccessResponse; version: number } | ApiError> {
  const result = await getTournamentByPublicId(db, publicId);
  if (!result) return { error: { code: 'TOURNAMENT_NOT_FOUND', message: 'Tournament not found' } };
  const passphraseVal = validateManagementPassphrase(passphrase);
  if (!passphraseVal.valid) return { error: { code: 'ACCESS_DENIED', message: 'Invalid management passphrase' } };

  const ok = await verifyPassphrase(passphrase, result.record.management_passphrase_hash || '');
  if (!ok) {
    return { error: { code: 'ACCESS_DENIED', message: 'Invalid management passphrase' } };
  }

  const managementToken = await generateManagementToken();
  const passphraseHash = await hashPassphrase(passphrase);
  await setTournamentAccess(db, result.record.id, passphraseHash, await hashAdminToken(managementToken));
  return { data: { managementToken, adminUrl: `/tournaments/manage/${managementToken}` }, version: result.record.version };
}

export async function migrateTournamentPassphraseService(
  db: D1Database,
  legacyAdminToken: string,
  passphrase: string
): Promise<{ data: TournamentAccessResponse; version: number } | ApiError> {
  const validation = validateManagementPassphrase(passphrase);
  if (!validation.valid) return { error: { code: validation.code!, message: validation.message! } };
  const result = await getTournamentByAdminHash(db, await hashAdminToken(legacyAdminToken));
  if (!result) return { error: { code: 'TOURNAMENT_NOT_FOUND', message: 'Tournament not found' } };
  if (result.record.management_passphrase_hash) return { error: { code: 'ACCESS_DENIED', message: 'Passphrase migration already completed' } };
  const managementToken = await generateManagementToken();
  const passphraseHash = await hashPassphrase(passphrase);
  await setTournamentAccess(db, result.record.id, passphraseHash, await hashAdminToken(managementToken));
  return { data: { managementToken, adminUrl: `/tournaments/manage/${managementToken}` }, version: result.record.version };
}

async function getManagementResult(db: D1Database, managementToken: string) {
  return getTournamentByManagementHash(db, await hashAdminToken(managementToken));
}

export async function getAdminTournamentService(
  db: D1Database,
  adminToken: string
): Promise<{ data: AdminTournamentDto; version: number } | ApiError> {
  let result;
  try {
    result = await getManagementResult(db, adminToken);
  } catch (err) {
    if (err instanceof CorruptedStateError) {
      return { error: { code: 'DATA_CORRUPTION', message: 'Persisted tournament state is corrupted' } };
    }
    throw err;
  }

  if (!result) {
    return { error: { code: 'TOURNAMENT_NOT_FOUND', message: 'Tournament not found' } };
  }

  const { record, aggregate } = result;
  const standings = aggregate.tournament.format === 'round_robin'
    ? calculateRoundRobinStandings(aggregate.entrants, aggregate.matches)
    : [];

  return {
    data: {
      aggregate,
      standings,
      publicUrl: `/tournaments/view/${record.public_id}`,
    },
    version: record.version,
  };
}

export async function getPublicTournamentService(
  db: D1Database,
  publicId: string
): Promise<{ data: PublicTournamentDto; version: number } | ApiError> {
  let result;
  try {
    result = await getTournamentByPublicId(db, publicId);
  } catch (err) {
    if (err instanceof CorruptedStateError) {
      return { error: { code: 'DATA_CORRUPTION', message: 'Persisted tournament state is corrupted' } };
    }
    throw err;
  }

  if (!result) {
    return { error: { code: 'TOURNAMENT_NOT_FOUND', message: 'Tournament not found' } };
  }

  const { record, aggregate } = result;
  const standings = aggregate.tournament.format === 'round_robin'
    ? calculateRoundRobinStandings(aggregate.entrants, aggregate.matches)
    : [];

  return {
    data: toPublicDto(aggregate, standings),
    version: record.version,
  };
}

export async function updateTournamentService(
  db: D1Database,
  adminToken: string,
  req: UpdateTournamentRequest
): Promise<{ data: AdminTournamentDto; version: number } | ApiError> {
  let result;
  try {
    result = await getManagementResult(db, adminToken);
  } catch (err) {
    if (err instanceof CorruptedStateError) {
      return { error: { code: 'DATA_CORRUPTION', message: 'Persisted tournament state is corrupted' } };
    }
    throw err;
  }

  if (!result) {
    return { error: { code: 'TOURNAMENT_NOT_FOUND', message: 'Tournament not found' } };
  }

  const { record, aggregate } = result;

  if (record.version !== req.expectedVersion) {
    return { error: { code: 'STALE_VERSION', message: 'Tournament was updated by another session. Please refresh.' } };
  }

  let nextAggregate = aggregate;

  if (req.command.type === 'updateEntrants') {
    const val = validateEntrantsList(req.command.entrants, aggregate.tournament.entrantType);
    if (!val.valid) {
      return { error: { code: val.code!, message: val.message!, fields: val.fields } };
    }

    const newEntrants: Entrant[] = req.command.entrants.map((e, idx) => ({
      id: (e as any).id || crypto.randomUUID(),
      tournamentId: aggregate.tournament.id,
      seed: e.seed || idx + 1,
      name: e.name.trim(),
      roster: e.roster ? e.roster.map((r) => r.trim()) : [],
    }));

    const preview = reconcileAggregateEntrants(aggregate, newEntrants);

    if (preview.invalidatedMatchIds.length > 0) {
      const confirmed = req.confirmInvalidation || [];
      const isConfirmed = preview.invalidatedMatchIds.every((id) => confirmed.includes(id));
      if (!isConfirmed) {
        return {
          error: {
            code: 'INVALIDATION_CONFIRMATION_REQUIRED',
            message: `${preview.invalidatedMatchIds.length} match result(s) will be cleared. Confirmation required.`,
            fields: { invalidatedMatchIds: JSON.stringify(preview.invalidatedMatchIds) },
          },
        };
      }
    }

    nextAggregate = preview.desiredAggregate;
  } else if (req.command.type === 'updateMetadata') {
    nextAggregate = {
      ...aggregate,
      tournament: {
        ...aggregate.tournament,
        name: req.command.name ? req.command.name.trim() : aggregate.tournament.name,
        defaultBestOf: req.command.defaultBestOf || aggregate.tournament.defaultBestOf,
      },
    };
  } else {
    return { error: { code: 'UNSUPPORTED_COMMAND', message: 'Unsupported command type' } };
  }

  const updateRes = await updateTournamentAggregate(db, aggregate.tournament.id, req.expectedVersion, nextAggregate);

  if (!updateRes.success) {
    return { error: { code: 'STALE_VERSION', message: 'Tournament update failed due to concurrent modification.' } };
  }

  return getAdminTournamentService(db, adminToken);
}

export async function updateMatchService(
  db: D1Database,
  adminToken: string,
  matchId: string,
  req: MatchMutationRequest
): Promise<{ data: AdminTournamentDto; version: number } | ApiError> {
  let result;
  try {
    result = await getManagementResult(db, adminToken);
  } catch (err) {
    if (err instanceof CorruptedStateError) {
      return { error: { code: 'DATA_CORRUPTION', message: 'Persisted tournament state is corrupted' } };
    }
    throw err;
  }

  if (!result) {
    return { error: { code: 'TOURNAMENT_NOT_FOUND', message: 'Tournament not found' } };
  }

  const { record, aggregate } = result;

  if (record.version !== req.expectedVersion) {
    return { error: { code: 'STALE_VERSION', message: 'Tournament was updated by another session. Please refresh.' } };
  }

  const progressRes = applyMatchCommand(aggregate, matchId, req.command);

  if ('error' in progressRes) {
    return progressRes;
  }

  if (progressRes.invalidatedMatchIds.length > 0) {
    const confirmed = req.confirmInvalidation || [];
    const isConfirmed = progressRes.invalidatedMatchIds.every((id) => confirmed.includes(id));
    if (!isConfirmed) {
      return {
        error: {
          code: 'INVALIDATION_CONFIRMATION_REQUIRED',
          message: `${progressRes.invalidatedMatchIds.length} downstream match result(s) will be cleared. Confirmation required.`,
          fields: { invalidatedMatchIds: JSON.stringify(progressRes.invalidatedMatchIds) },
        },
      };
    }
  }

  const updateRes = await updateTournamentAggregate(
    db,
    aggregate.tournament.id,
    req.expectedVersion,
    progressRes.aggregate
  );

  if (!updateRes.success) {
    return { error: { code: 'STALE_VERSION', message: 'Match update failed due to concurrent modification.' } };
  }

  return getAdminTournamentService(db, adminToken);
}

export async function deleteTournamentService(
  db: D1Database,
  managementToken: string,
  expectedVersion: number
): Promise<{ data: { success: boolean }; version: number } | ApiError> {
  if (!Number.isInteger(expectedVersion)) {
    return { error: { code: 'INVALID_INPUT', message: 'A valid expected version is required.' } };
  }

  const adminHash = await hashAdminToken(managementToken);
  let record = await getTournamentByManagementHash(db, adminHash);
  if (!record) {
    record = await getTournamentByAdminHash(db, adminHash);
  }
  if (!record) {
    return { error: { code: 'TOURNAMENT_NOT_FOUND', message: 'Tournament not found' } };
  }

  if (record.record.version !== expectedVersion) {
    return { error: { code: 'STALE_VERSION', message: 'Tournament was updated by another session. Please refresh.' } };
  }

  const deleted = await deleteTournamentRecord(db, record.record.id, expectedVersion);
  if (!deleted) {
    return { error: { code: 'DELETE_FAILED', message: 'Tournament could not be deleted.' } };
  }

  return { data: { success: true }, version: record.record.version };
}
