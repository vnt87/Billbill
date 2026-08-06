import { D1Database } from '@cloudflare/workers-types';
import {
  CreateTournamentInput,
  AdminTournamentDto,
  PublicTournamentDto,
  UpdateTournamentRequest,
  MatchMutationRequest,
  ApiError,
} from '../../../shared/tournaments/contracts';
import { TournamentAggregate, Entrant, Tournament, Match } from '../../../shared/tournaments/types';
import { validateCreateTournamentInput } from '../../../shared/tournaments/validation';
import { generateCapabilities, hashAdminToken } from './access';
import {
  createTournamentRecord,
  getTournamentByAdminHash,
  getTournamentByPublicId,
  updateTournamentAggregate,
} from './repository';
import { generateSingleEliminationMatches } from '../../../shared/tournaments/generateSingleElimination';
import { generateDoubleEliminationMatches } from '../../../shared/tournaments/generateDoubleElimination';
import { generateRoundRobinMatches } from '../../../shared/tournaments/generateRoundRobin';
import { calculateRoundRobinStandings } from '../../../shared/tournaments/standings';
import { toPublicDto } from '../../../shared/tournaments/serializers';
import { reconcileAggregateEntrants } from '../../../shared/tournaments/invalidation';
import { applyMatchCommand } from '../../../shared/tournaments/progressMatches';

export async function createTournamentService(
  db: D1Database,
  input: CreateTournamentInput
): Promise<{ data: { tournament: Tournament; adminUrl: string; publicUrl: string }; version: number } | ApiError> {
  const val = validateCreateTournamentInput(input);
  if (!val.valid) {
    return { error: { code: val.code!, message: val.message!, fields: val.fields } };
  }

  const tournamentId = crypto.randomUUID();
  const caps = await generateCapabilities();
  const now = new Date().toISOString();

  const tournament: Tournament = {
    id: tournamentId,
    name: input.name.trim(),
    format: input.format,
    entrantType: input.entrantType,
    status: 'draft',
    defaultBestOf: input.defaultBestOf,
    version: 1,
    createdAt: now,
    updatedAt: now,
  };

  const entrants: Entrant[] = input.entrants.map((e, idx) => ({
    id: crypto.randomUUID(),
    tournamentId,
    seed: e.seed || idx + 1,
    name: e.name.trim(),
    roster: e.roster ? e.roster.map((r) => r.trim()) : [],
  }));

  // Generate initial bracket/schedule
  let matches: Match[] = [];
  if (input.format === 'single_elimination') {
    matches = generateSingleEliminationMatches(tournamentId, entrants, input.defaultBestOf);
  } else if (input.format === 'double_elimination') {
    matches = generateDoubleEliminationMatches(tournamentId, entrants, input.defaultBestOf);
  } else if (input.format === 'round_robin') {
    matches = generateRoundRobinMatches(tournamentId, entrants, input.defaultBestOf);
  }

  const aggregate: TournamentAggregate = {
    tournament,
    entrants,
    matches,
  };

  await createTournamentRecord(db, {
    id: tournamentId,
    publicId: caps.publicId,
    adminTokenHash: caps.adminTokenHash,
    aggregate,
  });

  return {
    data: {
      tournament,
      adminUrl: `/tournaments/manage/${caps.adminToken}`,
      publicUrl: `/tournaments/view/${caps.publicId}`,
    },
    version: 1,
  };
}

export async function getAdminTournamentService(
  db: D1Database,
  adminToken: string
): Promise<{ data: AdminTournamentDto; version: number } | ApiError> {
  const hash = await hashAdminToken(adminToken);
  const result = await getTournamentByAdminHash(db, hash);

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
  const result = await getTournamentByPublicId(db, publicId);

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
  const hash = await hashAdminToken(adminToken);
  const result = await getTournamentByAdminHash(db, hash);

  if (!result) {
    return { error: { code: 'TOURNAMENT_NOT_FOUND', message: 'Tournament not found' } };
  }

  const { record, aggregate } = result;

  if (record.version !== req.expectedVersion) {
    return { error: { code: 'STALE_VERSION', message: 'Tournament was updated by another session. Please refresh.' } };
  }

  let nextAggregate = aggregate;

  if (req.command.type === 'updateEntrants') {
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
  const hash = await hashAdminToken(adminToken);
  const result = await getTournamentByAdminHash(db, hash);

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
