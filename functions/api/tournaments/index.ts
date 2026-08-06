import { D1Database } from '@cloudflare/workers-types';
import { createTournamentService } from '../../_shared/tournaments/service';
import { jsonSuccess, jsonError } from '../../_shared/tournaments/responses';
import { CreateTournamentInput } from '../../../shared/tournaments/contracts';

interface Env {
  TOURNAMENT_DB: D1Database;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  if (context.request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  if (context.request.method !== 'POST') {
    return jsonError('UNSUPPORTED_COMMAND', 'Method not allowed', 405);
  }

  try {
    const payload: CreateTournamentInput = await context.request.json();
    const result = await createTournamentService(context.env.TOURNAMENT_DB, payload);

    if ('error' in result) {
      return jsonError(result.error.code, result.error.message, 422, result.error.fields);
    }

    return jsonSuccess(result.data, result.version, 201);
  } catch (error) {
    return jsonError('INVALID_INPUT', 'Malformed request payload', 400);
  }
};
