import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { LanguageProvider } from '../../src/contexts/LanguageContext';
import TournamentLanding from '../../src/features/tournaments/pages/TournamentLanding';

function TestLanding() {
  return (
    <LanguageProvider>
      <MemoryRouter initialEntries={['/tournaments']}>
        <Routes>
          <Route path="/tournaments" element={<TournamentLanding />} />
          <Route path="/tournaments/manage/:adminToken" element={<div>Admin Page Mock</div>} />
        </Routes>
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
    const headings = screen.getAllByText(/Create Tournament|Tạo Giải Đấu/i);
    expect(headings.length).toBeGreaterThan(0);
  });

  it('allows filling form and submitting tournament creation', async () => {
    // Mock fetch
    vi.spyOn(global, 'fetch').mockImplementation(async (url, options) => {
      const urlStr = url.toString();
      if (urlStr.endsWith('/api/tournaments') && (options?.method || 'GET') === 'GET') {
        return new Response(JSON.stringify({ data: { tournaments: [] }, version: 1 }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
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

    fireEvent.click(await screen.findByRole('button', { name: /Create Tournament|Tạo Giải Đấu/i }));

    const nameInput = screen.getByPlaceholderText(/Friday Club Cup|Giải Bi-a Thứ 6/i);
    fireEvent.change(nameInput, { target: { value: 'Sunday Showdown' } });
    fireEvent.change(screen.getByPlaceholderText(/At least 3 characters|Ít nhất 3 ký tự/i), { target: { value: 'secret_passphrase' } });

    const createButtons = screen.getAllByRole('button', { name: /Create Tournament|Tạo Giải Đấu/i });
    const submitButton = createButtons[createButtons.length - 1];
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Admin Page Mock/i)).toBeInTheDocument();
    });
  });

  it('keeps the creation modal viewport-safe and uses the compact desktop layout', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(new Response(JSON.stringify({ data: { tournaments: [] }, version: 1 }), { status: 200 }));
    render(<TestLanding />);
    fireEvent.click(await screen.findByRole('button', { name: /Create Tournament|Tạo Giải Đấu/i }));

    const backdrop = screen.getByTestId('modal-backdrop');
    expect(backdrop).toHaveClass('fixed', 'top-0', 'h-[100dvh]', 'w-screen');
    expect(backdrop).not.toHaveClass('min-h-screen');
    expect(screen.getByTestId('create-tournament-layout')).toHaveClass('lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]');
    expect(screen.getAllByText('*').every((element) => element.classList.contains('text-red-600'))).toBe(true);
    expect(screen.getByLabelText(/Management Passphrase/i)).toBeRequired();
  });
});
