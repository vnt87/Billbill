import { D1Database } from '@cloudflare/workers-types';
import { getPublicTournamentService } from '../../_shared/tournaments/service';
import { jsonSuccess, jsonError } from '../../_shared/tournaments/responses';

interface Env {
  TOURNAMENT_DB: D1Database;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const token = context.params.token as string;
  if (!token) {
    return jsonError('TOURNAMENT_NOT_FOUND', 'Not found', 404);
  }

  if (context.request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': 'https://chiabill.pages.dev',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  if (context.request.method === 'GET') {
    const result = await getPublicTournamentService(context.env.TOURNAMENT_DB, token);
    if ('error' in result) {
      let status = 400;
      if (result.error.code === 'TOURNAMENT_NOT_FOUND') status = 404;
      if (result.error.code === 'DATA_CORRUPTION') status = 500;
      return jsonError(result.error.code, result.error.message, status);
    }

    return jsonSuccess(result.data, result.version, 200);
  }

  return jsonError('UNSUPPORTED_COMMAND', 'Method not allowed', 405);
};
