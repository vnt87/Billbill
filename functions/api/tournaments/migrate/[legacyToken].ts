import { D1Database } from '@cloudflare/workers-types';
import { migrateTournamentPassphraseService } from '../../../_shared/tournaments/service';
import { jsonSuccess, jsonError } from '../../../_shared/tournaments/responses';

interface Env { TOURNAMENT_DB: D1Database; }

export const onRequest: PagesFunction<Env> = async (context) => {
  const legacyToken = context.params.legacyToken as string;
  if (!legacyToken || context.request.method !== 'POST') return jsonError('UNSUPPORTED_COMMAND', 'Method not allowed', 405);
  try {
    const payload = await context.request.json() as { passphrase?: string };
    const result = await migrateTournamentPassphraseService(context.env.TOURNAMENT_DB, legacyToken, payload.passphrase || '');
    if ('error' in result) return jsonError(result.error.code, result.error.message, result.error.code === 'TOURNAMENT_NOT_FOUND' ? 404 : 422);
    return jsonSuccess(result.data, result.version, 200);
  } catch {
    return jsonError('INVALID_INPUT', 'Malformed request payload', 400);
  }
};
