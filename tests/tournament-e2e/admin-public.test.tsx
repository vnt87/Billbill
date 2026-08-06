import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { LanguageProvider } from '../../src/contexts/LanguageContext';
import TournamentAdmin from '../../src/features/tournaments/pages/TournamentAdmin';
import TournamentPublic from '../../src/features/tournaments/pages/TournamentPublic';

describe('Admin Dashboard & Public Spectator UX — Phase 8 & 9', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders admin view with match controls and private note capability', async () => {
    vi.spyOn(global, 'fetch').mockImplementation(async (url) => {
      const urlStr = url.toString();
      if (urlStr.includes('/api/tournaments/manage/admin_123')) {
        return new Response(
          JSON.stringify({
            data: {
              aggregate: {
                tournament: {
                  id: 't-1',
                  name: 'Admin Test Cup',
                  format: 'single_elimination',
                  entrantType: 'individual',
                  status: 'active',
                  defaultBestOf: 3,
                  version: 1,
                  createdAt: '2026-08-06T00:00:00Z',
                  updatedAt: '2026-08-06T00:00:00Z',
                },
                entrants: [
                  { id: 'e-1', tournamentId: 't-1', seed: 1, name: 'Alice', roster: [] },
                  { id: 'e-2', tournamentId: 't-1', seed: 2, name: 'Bob', roster: [] },
                ],
                matches: [
                  {
                    id: 'm-1',
                    tournamentId: 't-1',
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
                    privateNote: 'Organizer secret note',
                  },
                ],
              },
              standings: [],
              publicUrl: '/tournaments/view/pub_123',
            },
            version: 1,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response(JSON.stringify({}), { status: 200 });
    });

    render(
      <LanguageProvider>
        <MemoryRouter initialEntries={['/tournaments/manage/admin_123']}>
          <Routes>
            <Route path="/tournaments/manage/:adminToken" element={<TournamentAdmin />} />
          </Routes>
        </MemoryRouter>
      </LanguageProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Admin Test Cup')).toBeInTheDocument();
      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('Bob')).toBeInTheDocument();
    });
  });

  it('renders spectator view without private notes or edit controls', async () => {
    vi.spyOn(global, 'fetch').mockImplementation(async (url) => {
      const urlStr = url.toString();
      if (urlStr.includes('/api/tournaments/view/pub_123')) {
        return new Response(
          JSON.stringify({
            data: {
              id: 't-1',
              name: 'Public Spectator Cup',
              format: 'single_elimination',
              entrantType: 'individual',
              status: 'active',
              defaultBestOf: 3,
              version: 1,
              createdAt: '2026-08-06T00:00:00Z',
              updatedAt: '2026-08-06T00:00:00Z',
              entrants: [
                { id: 'e-1', tournamentId: 't-1', seed: 1, name: 'Alice', roster: [] },
                { id: 'e-2', tournamentId: 't-1', seed: 2, name: 'Bob', roster: [] },
              ],
              matches: [
                {
                  id: 'm-1',
                  side: 'winners',
                  round: 1,
                  position: 1,
                  entrantAId: 'e-1',
                  entrantBId: 'e-2',
                  bestOf: 3,
                  scoreA: 2,
                  scoreB: 1,
                  winnerId: 'e-1',
                  state: 'completed',
                },
              ],
              standings: [],
            },
            version: 1,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response(JSON.stringify({}), { status: 200 });
    });

    render(
      <LanguageProvider>
        <MemoryRouter initialEntries={['/tournaments/view/pub_123']}>
          <Routes>
            <Route path="/tournaments/view/:publicToken" element={<TournamentPublic />} />
          </Routes>
        </MemoryRouter>
      </LanguageProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Public Spectator Cup')).toBeInTheDocument();
      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('Bob')).toBeInTheDocument();
    });

    // Ensure no admin buttons or private notes are present
    expect(screen.queryByText(/Save Score|Save Note|Organizer secret note/i)).toBeNull();
  });
});
