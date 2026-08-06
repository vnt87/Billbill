import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../../src/contexts/LanguageContext';
import TournamentLanding from '../../src/features/tournaments/pages/TournamentLanding';

function TestLanding() {
  return (
    <LanguageProvider>
      <MemoryRouter>
        <TournamentLanding />
      </MemoryRouter>
    </LanguageProvider>
  );
}

describe('Tournament Creation & Navigation — Phase 6 & 7', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders tournament landing creation form', () => {
    render(<TestLanding />);
    const headings = screen.getAllByText(/Create a Tournament|Tạo Giải Đấu/i);
    expect(headings.length).toBeGreaterThan(0);
  });

  it('allows filling form and submitting tournament creation', async () => {
    // Mock fetch
    vi.spyOn(global, 'fetch').mockImplementation(async (url) => {
      const urlStr = url.toString();
      if (urlStr.includes('/api/tournaments')) {
        return new Response(
          JSON.stringify({
            data: {
              tournament: { id: 't-1', name: 'Test Cup' },
              adminUrl: '/tournaments/manage/admin_token_abc',
              publicUrl: '/tournaments/view/pub_token_xyz',
            },
            version: 1,
          }),
          { status: 201, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response(JSON.stringify({}), { status: 200 });
    });

    render(<TestLanding />);

    const nameInput = screen.getByPlaceholderText(/Friday Club Cup|Giải Bi-a Thứ 6/i);
    fireEvent.change(nameInput, { target: { value: 'Sunday Showdown' } });

    const submitButton = screen.getByRole('button', { name: /Create Tournament|Tạo Giải Đấu/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getAllByText(/Admin Link|Link Quản Lý/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Spectator Link|Link Xem Direct/i).length).toBeGreaterThan(0);
    });
  });
});
