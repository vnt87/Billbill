import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from '../../src/App';
import { LanguageProvider } from '../../src/contexts/LanguageContext';

function TestApp() {
  return (
    <LanguageProvider>
      <App />
    </LanguageProvider>
  );
}

describe('Regression - Bill App Routes', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/');
  });

  it('renders calculator page at root / route', () => {
    window.history.pushState({}, '', '/');
    render(<TestApp />);
    const elements = screen.getAllByText(/ChiaBill/i);
    expect(elements.length).toBeGreaterThan(0);
    expect(elements[0]).toBeInTheDocument();
  });

  it('renders history route', () => {
    window.history.pushState({}, '', '/history');
    render(<TestApp />);
    const elements = screen.getAllByText(/ChiaBill/i);
    expect(elements.length).toBeGreaterThan(0);
    expect(elements[0]).toBeInTheDocument();
  });
});
