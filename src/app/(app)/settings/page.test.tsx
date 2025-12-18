import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import * as store from '@/lib/store';
import { supabase } from '@/lib/supabase';

describe('SettingsPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('hides Change Password for Google-only users', async () => {
    vi.spyOn(store, 'useStore').mockImplementation(() => ({
      currentUser: { id: 'me', name: 'Jay', avatar: '', tokens: 10, isPrivate: false },
      fetchFriends: vi.fn(),
      fetchSavedStories: vi.fn(),
      fetchStories: vi.fn(),
      savedStoryIds: [],
      setCurrentUser: vi.fn(),
      setProfileUpdateInProgress: vi.fn(),
      logoutUser: vi.fn(),
    }) as any);

    vi.spyOn(supabase.auth, 'getUser').mockResolvedValueOnce({ data: { user: { id: 'u1', email: 'g@example.com', identities: [{ provider: 'google' }] } }, error: null } as any);

    const { default: SettingsPage } = await import('./page');

    render(<SettingsPage />);

    // Wait for the page to render and decide Google-only status
    expect(await screen.findByText(/Edit Profile/i)).toBeInTheDocument();

    // The Change Password item should not be rendered
    await waitFor(() => expect(screen.queryByText(/Change Password/i)).toBeNull());
  });

  it('shows Change Password for email users', async () => {
    vi.spyOn(store, 'useStore').mockImplementation(() => ({
      currentUser: { id: 'me', name: 'Jay', avatar: '', tokens: 10, isPrivate: false },
      fetchFriends: vi.fn(),
      fetchSavedStories: vi.fn(),
      fetchStories: vi.fn(),
      savedStoryIds: [],
      setCurrentUser: vi.fn(),
      setProfileUpdateInProgress: vi.fn(),
      logoutUser: vi.fn(),
    }) as any);

    vi.spyOn(supabase.auth, 'getUser').mockResolvedValueOnce({ data: { user: { id: 'u2', email: 'e@example.com', identities: [{ provider: 'email' }] } }, error: null } as any);

    const { default: SettingsPage } = await import('./page');

    render(<SettingsPage />);

    // Wait for page to render and show change password
    expect(await screen.findByText(/Change Password/i)).toBeInTheDocument();
  });
});
