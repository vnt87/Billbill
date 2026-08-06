import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from '../../src/App';
import { LanguageProvider } from '../../src/contexts/LanguageContext';

describe('Full End-to-End Tournament User Journey Simulation', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.history.pushState({}, '', '/tournaments');
  });

  it('executes full tournament lifecycle: landing -> creation -> admin match scoring -> spectator view', async () => {
    // Simulated in-memory database state
    let savedAggregate: any = null;
    const adminToken = 'admin_secret_token_123';
    const publicToken = 'public_spectator_token_456';

    vi.spyOn(global, 'fetch').mockImplementation(async (url, init) => {
      const urlStr = url.toString();
      const method = init?.method || 'GET';

      // 1. POST /api/tournaments (Create Tournament)
      if (urlStr.includes('/api/tournaments') && method === 'POST') {
        const body = JSON.parse(init?.body as string);
        savedAggregate = {
          tournament: {
            id: 'tourney-1',
            name: body.name,
            format: body.format,
            entrantType: body.entrantType,
            status: 'active',
            defaultBestOf: body.defaultBestOf,
            version: 1,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          entrants: body.entrants.map((e: any, idx: number) => ({
            id: `e-${idx + 1}`,
            tournamentId: 'tourney-1',
            seed: e.seed,
            name: e.name,
            roster: e.roster || [],
          })),
          matches: [
            {
              id: 'm-1',
              tournamentId: 'tourney-1',
              side: 'winners',
              round: 1,
              position: 1,
              sourceA: { type: 'seed', seed: 1 },
              sourceB: { type: 'seed', seed: 2 },
              entrantAId: 'e-1',
              entrantBId: 'e-2',
              bestOf: 3,
              scoreA: null,
              scoreB: null,
              winnerId: null,
              state: 'ready',
              privateNote: null,
            },
          ],
        };

        return new Response(
          JSON.stringify({
            data: {
              tournament: savedAggregate.tournament,
              adminUrl: `/tournaments/manage/${adminToken}`,
              publicUrl: `/tournaments/view/${publicToken}`,
            },
            version: 1,
          }),
          { status: 201, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // 2. GET /api/tournaments/manage/:token (Admin Read)
      if (urlStr.includes(`/api/tournaments/manage/${adminToken}`) && method === 'GET') {
        return new Response(
          JSON.stringify({
            data: {
              aggregate: savedAggregate,
              standings: [],
              publicUrl: `/tournaments/view/${publicToken}`,
            },
            version: savedAggregate.tournament.version,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // 3. PATCH /api/tournaments/manage/:token/matches/:matchId (Admin Score Edit)
      if (urlStr.includes(`/api/tournaments/manage/${adminToken}/matches/m-1`) && method === 'PATCH') {
        const body = JSON.parse(init?.body as string);
        if (body.command.type === 'completeResult') {
          savedAggregate.matches[0].scoreA = body.command.scoreA;
          savedAggregate.matches[0].scoreB = body.command.scoreB;
          savedAggregate.matches[0].winnerId = 'e-1';
          savedAggregate.matches[0].state = 'completed';
          savedAggregate.tournament.version += 1;
        }

        return new Response(
          JSON.stringify({
            data: {
              aggregate: savedAggregate,
              standings: [],
              publicUrl: `/tournaments/view/${publicToken}`,
            },
            version: savedAggregate.tournament.version,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // 4. GET /api/tournaments/view/:token (Public Read)
      if (urlStr.includes(`/api/tournaments/view/${publicToken}`) && method === 'GET') {
        return new Response(
          JSON.stringify({
            data: {
              id: savedAggregate.tournament.id,
              name: savedAggregate.tournament.name,
              format: savedAggregate.tournament.format,
              entrantType: savedAggregate.tournament.entrantType,
              status: savedAggregate.tournament.status,
              defaultBestOf: savedAggregate.tournament.defaultBestOf,
              version: savedAggregate.tournament.version,
              createdAt: savedAggregate.tournament.createdAt,
              updatedAt: savedAggregate.tournament.updatedAt,
              entrants: savedAggregate.entrants,
              matches: savedAggregate.matches.map((m: any) => ({
                id: m.id,
                side: m.side,
                round: m.round,
                position: m.position,
                entrantAId: m.entrantAId,
                entrantBId: m.entrantBId,
                bestOf: m.bestOf,
                scoreA: m.scoreA,
                scoreB: m.scoreB,
                winnerId: m.winnerId,
                state: m.state,
              })),
              standings: [],
            },
            version: savedAggregate.tournament.version,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      return new Response(JSON.stringify({ data: { tournaments: [] }, version: 1 }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    });

    const { unmount } = render(
      <LanguageProvider>
        <App />
      </LanguageProvider>
    );

    // Step A: Landing Creation Page
    fireEvent.click(await screen.findByRole('button', { name: /Create Tournament|Tạo Giải Đấu/i }));
    const nameInput = await screen.findByPlaceholderText(/Friday Club Cup|Giải Bi-a Thứ 6/i);
    fireEvent.change(nameInput, { target: { value: 'Billiard Club Championship 2026' } });
    fireEvent.change(screen.getByPlaceholderText(/At least 3 characters|Ít nhất 3 ký tự/i), { target: { value: 'secret_passphrase' } });

    // Verify seed randomization button exists and works
    const randomizeBtn = screen.getByRole('button', { name: /Randomize|Bốc Thăm/i });
    fireEvent.click(randomizeBtn);

    // Submit form
    const createButtons = screen.getAllByRole('button', { name: /Create Tournament|Tạo Giải Đấu/i });
    const createBtn = createButtons[createButtons.length - 1];
    fireEvent.submit(createBtn.closest('form')!);

    // Step B: Direct navigation to Admin Dashboard
    await waitFor(() => {
      expect(screen.getByText('Billiard Club Championship 2026')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText('Billiard Club Championship 2026')).toBeInTheDocument();
      expect(screen.getByText(/WINNERS • R1 M1/i)).toBeInTheDocument();
    });

    // Step D: Edit Score in Admin View
    const editScoreBtn = screen.getByRole('button', { name: /Save Score|Recalculate|Lưu Kết Quả/i });
    fireEvent.click(editScoreBtn);

    const spinButtons = screen.getAllByRole('spinbutton');
    fireEvent.change(spinButtons[0], { target: { value: '2' } });
    fireEvent.change(spinButtons[1], { target: { value: '0' } });

    const saveScoreBtn = screen.getByRole('button', { name: 'Save Score' });
    fireEvent.click(saveScoreBtn);

    await waitFor(() => {
      expect(screen.getByText(/Recalculate|Tính Lại/i)).toBeInTheDocument();
    });

    // Unmount admin view before mounting spectator view
    unmount();

    // Step E: Navigate to Spectator View
    window.history.pushState({}, '', `/tournaments/view/${publicToken}`);
    render(
      <LanguageProvider>
        <App />
      </LanguageProvider>
    );

    await waitFor(() => {
      expect(screen.getAllByText('Billiard Club Championship 2026').length).toBeGreaterThan(0);
    });

    // Verify spectator view has NO edit controls
    expect(screen.queryByRole('button', { name: /Recalculate|Save Score/i })).toBeNull();
  });
});
