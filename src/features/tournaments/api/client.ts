import {
  CreateTournamentInput,
  CreateTournamentResponseData,
  AdminTournamentDto,
  PublicTournamentDto,
  UpdateTournamentRequest,
  MatchMutationRequest,
  ApiResponse,
} from '../../../../shared/tournaments/contracts';

async function request<T>(url: string, options?: RequestInit): Promise<ApiResponse<T>> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    const signal = options?.signal || controller.signal;

    const res = await fetch(url, {
      ...options,
      signal,
      headers: {
        'Content-Type': 'application/json',
        ...(options?.headers || {}),
      },
    });
    clearTimeout(timeoutId);

    let json: any;
    try {
      json = await res.json();
    } catch {
      return {
        error: {
          code: 'SERVER_ERROR',
          message: `HTTP ${res.status}: Failed to parse response body`,
        },
      };
    }

    if (!res.ok) {
      return {
        error: {
          code: json?.error?.code || 'SERVER_ERROR',
          message: json?.error?.message || `HTTP ${res.status} Error`,
          fields: json?.error?.fields,
        },
      };
    }

    if (json && typeof json === 'object' && ('data' in json || 'error' in json)) {
      return json;
    }

    return {
      error: {
        code: 'INVALID_RESPONSE',
        message: 'Response format is invalid',
      },
    };
  } catch (error: any) {
    return {
      error: {
        code: 'NETWORK_ERROR',
        message: error?.name === 'AbortError' ? 'Request timed out. Please try again.' : 'Network request failed. Please check your connection.',
      },
    };
  }
}

export async function createTournament(
  input: CreateTournamentInput
): Promise<ApiResponse<CreateTournamentResponseData>> {
  return request<CreateTournamentResponseData>('/api/tournaments', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function getAdminTournament(
  adminToken: string
): Promise<ApiResponse<AdminTournamentDto>> {
  return request<AdminTournamentDto>(`/api/tournaments/manage/${adminToken}`, {
    method: 'GET',
  });
}

export async function getPublicTournament(
  publicToken: string
): Promise<ApiResponse<PublicTournamentDto>> {
  return request<PublicTournamentDto>(`/api/tournaments/view/${publicToken}`, {
    method: 'GET',
  });
}

export async function updateTournament(
  adminToken: string,
  payload: UpdateTournamentRequest
): Promise<ApiResponse<AdminTournamentDto>> {
  return request<AdminTournamentDto>(`/api/tournaments/manage/${adminToken}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function updateMatch(
  adminToken: string,
  matchId: string,
  payload: MatchMutationRequest
): Promise<ApiResponse<AdminTournamentDto>> {
  return request<AdminTournamentDto>(`/api/tournaments/manage/${adminToken}/matches/${matchId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}
