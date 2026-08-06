import { ApiError, ApiErrorCode } from '../../../shared/tournaments/contracts';

const SECURITY_HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store, no-cache, must-revalidate',
  'Referrer-Policy': 'no-referrer',
  'Access-Control-Allow-Origin': 'https://chiabill.pages.dev',
  'X-Content-Type-Options': 'nosniff',
};

export function jsonSuccess<T>(data: T, version?: number, status = 200): Response {
  const body = { data, ...(version !== undefined ? { version } : {}) };
  return new Response(JSON.stringify(body), {
    status,
    headers: SECURITY_HEADERS,
  });
}

export function jsonError(
  code: ApiErrorCode | string,
  message: string,
  status = 400,
  fields?: Record<string, string>
): Response {
  const errBody: ApiError = {
    error: {
      code,
      message,
      ...(fields ? { fields } : {}),
    },
  };
  return new Response(JSON.stringify(errBody), {
    status,
    headers: SECURITY_HEADERS,
  });
}
