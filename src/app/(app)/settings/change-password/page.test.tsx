import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { supabase } from '@/lib/supabase';

describe('ChangePasswordPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('shows Google-managed message and hides form for Google-only users', async () => {
    vi.spyOn(supabase.auth, 'getUser').mockResolvedValueOnce({ data: { user: { id: 'u1', email: 'g@example.com', identities: [{ provider: 'google' }] } }, error: null } as any);

    const { default: ChangePasswordPage } = await import('./page');

    render(<ChangePasswordPage />);

    expect(await screen.findByText(/Your password is managed by Google/i)).toBeInTheDocument();
    // Ensure form inputs are not present (query by placeholder)
    expect(screen.queryByPlaceholderText(/Enter current password/i)).toBeNull();
    expect(screen.queryByPlaceholderText(/Enter new password/i)).toBeNull();
  });

  it('shows form for email/password users', async () => {
    vi.spyOn(supabase.auth, 'getUser').mockResolvedValueOnce({ data: { user: { id: 'u2', email: 'e@example.com', identities: [{ provider: 'email' }] } }, error: null } as any);

    const { default: ChangePasswordPage } = await import('./page');

    render(<ChangePasswordPage />);

    // Inputs do not have explicit label associations, so query by placeholder text instead
    expect(await screen.findByPlaceholderText(/Enter current password/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Enter new password/i)).toBeInTheDocument();
  });
});
