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
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options?.headers || {}),
      },
    });

    const json = await res.json();
    return json;
  } catch (error) {
    return {
      error: {
        code: 'NETWORK_ERROR',
        message: 'Network request failed. Please check your connection.',
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
