import { D1Database } from '@cloudflare/workers-types';
import { accessTournamentService } from '../../../_shared/tournaments/service';
import { jsonSuccess, jsonError } from '../../../_shared/tournaments/responses';

interface Env { TOURNAMENT_DB: D1Database; }

const attemptStore = new Map<string, { count: number; lockUntil: number }>();
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes lockout

export const onRequest: PagesFunction<Env> = async (context) => {
  const publicId = context.params.publicId as string;
  if (!publicId) return jsonError('TOURNAMENT_NOT_FOUND', 'Not found', 404);
  if (context.request.method !== 'POST') return jsonError('UNSUPPORTED_COMMAND', 'Method not allowed', 405);

  const clientIp = context.request.headers.get('cf-connecting-ip') || 'anon';
  const key = `${clientIp}:${publicId}`;
  const now = Date.now();
  const record = attemptStore.get(key);

  if (record && record.lockUntil > now) {
    const remainingSec = Math.ceil((record.lockUntil - now) / 1000);
    return jsonError(
      'RATE_LIMITED',
      `Too many failed attempts. Try again in ${remainingSec} seconds.`,
      429
    );
  }

  try {
    const payload = (await context.request.json()) as { passphrase?: string };
    const result = await accessTournamentService(context.env.TOURNAMENT_DB, publicId, payload.passphrase || '');
    if ('error' in result) {
      if (result.error.code === 'INVALID_PASSPHRASE' || result.error.code === 'ACCESS_DENIED') {
        const current = attemptStore.get(key) || { count: 0, lockUntil: 0 };
        const nextCount = current.count + 1;
        if (nextCount >= MAX_ATTEMPTS) {
          attemptStore.set(key, { count: nextCount, lockUntil: now + LOCKOUT_MS });
          return jsonError('RATE_LIMITED', 'Too many failed passphrase attempts. Access locked for 15 minutes.', 429);
        } else {
          attemptStore.set(key, { count: nextCount, lockUntil: 0 });
        }
      }
      return jsonError(result.error.code, result.error.message, result.error.code === 'TOURNAMENT_NOT_FOUND' ? 404 : 403);
    }

    attemptStore.delete(key);
    return jsonSuccess(result.data, result.version, 200);
  } catch {
    return jsonError('INVALID_INPUT', 'Malformed request payload', 400);
  }
};
