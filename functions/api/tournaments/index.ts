import { D1Database } from '@cloudflare/workers-types';
import { createTournamentService, listTournamentsService } from '../../_shared/tournaments/service';
import { jsonSuccess, jsonError } from '../../_shared/tournaments/responses';
import { CreateTournamentInput } from '../../../shared/tournaments/contracts';

interface Env {
  TOURNAMENT_DB: D1Database;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  if (context.request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': 'https://chiabill.pages.dev',
        'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  if (context.request.method === 'GET') {
    try {
      const result = await listTournamentsService(context.env.TOURNAMENT_DB);
      return jsonSuccess(result.data, result.version, 200);
    } catch (error: any) {
      console.error('Error listing tournaments:', error);
      return jsonError('INTERNAL_ERROR', 'Internal server error', 500);
    }
  }

  if (context.request.method !== 'POST') {
    return jsonError('UNSUPPORTED_COMMAND', 'Method not allowed', 405);
  }

  let payload: CreateTournamentInput;
  try {
    const rawText = await context.request.text();
    if (!rawText || !rawText.trim()) {
      return jsonError('INVALID_INPUT', 'Request body is empty', 400);
    }
    payload = JSON.parse(rawText);
  } catch (error: any) {
    return jsonError('INVALID_INPUT', `Malformed request payload: ${error?.message || 'Invalid JSON'}`, 400);
  }

  try {
    const result = await createTournamentService(context.env.TOURNAMENT_DB, payload);

    if ('error' in result) {
      return jsonError(result.error.code, result.error.message, 422, result.error.fields);
    }

    return jsonSuccess(result.data, result.version, 201);
  } catch (error: any) {
    console.error('Error creating tournament:', error);
    return jsonError('INTERNAL_ERROR', `Internal server error: ${error?.message || 'Unknown error'}`, 500);
  }
};
