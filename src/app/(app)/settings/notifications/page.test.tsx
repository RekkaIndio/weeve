import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as store from '@/lib/store';
import { supabase } from '@/lib/supabase';

describe('NotificationsPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches preferences and renders toggles', async () => {
    const mockedPreferences = {
      user_id: 'u1',
      push_notifications: true,
      email_notifications: false,
      story_invites: true,
      story_turns: false,
      story_completed: true,
      story_likes: true,
      story_comments: true,
      friend_requests: false,
      friend_accepted: true,
      group_invites: true,
      group_updates: false,
    };

    vi.spyOn(store, 'useStore').mockImplementation(() => ({
      currentUser: { id: 'u1', name: 'Jamie', avatar: '', tokens: 0, isPrivate: false },
      fetchFriends: vi.fn(),
      fetchSavedStories: vi.fn(),
      fetchStories: vi.fn(),
      savedStoryIds: [],
      setCurrentUser: vi.fn(),
      setProfileUpdateInProgress: vi.fn(),
      logoutUser: vi.fn(),
    }) as any);

    const maybeSingle = vi.fn().mockResolvedValueOnce({ data: mockedPreferences, error: null });
    const eq = vi.fn().mockReturnValue({ maybeSingle });
    const select = vi.fn().mockReturnValue({ eq });

    const upsert = vi.fn().mockResolvedValue({ error: null });

    vi.spyOn(supabase as any, 'from').mockImplementation((...args: any[]) => {
      const table = args[0] as string;
      if (table === 'notification_preferences') return { select, upsert } as any;
      return {} as any;
    });

    const { default: NotificationsPage } = await import('./page');

    render(<NotificationsPage />);

    // Wait for fetch to complete and the UI to render
    expect(await screen.findByText(/Push Notifications/i)).toBeInTheDocument();

    // Verify initial states (check span position classes)
    // The text node's closest div is the left column; we want the parent row which contains the button
    const pushLeft = screen.getByText(/Push Notifications/i).closest('div') as HTMLElement;
    const pushRow = pushLeft?.parentElement as HTMLElement;
    const pushButton = within(pushRow).getByRole('button') as HTMLElement;
    const pushInner = pushButton.querySelector('span') as HTMLElement;

    expect(pushInner.className).toContain('left-7'); // enabled

    const emailLeft = screen.getByText(/Email Notifications/i).closest('div') as HTMLElement;
    const emailRow = emailLeft?.parentElement as HTMLElement;
    const emailButton = within(emailRow).getByRole('button') as HTMLElement;
    const emailInner = emailButton.querySelector('span') as HTMLElement;

    expect(emailInner.className).toContain('left-1'); // disabled
  });

  it('toggles a preference and calls upsert, reverts on error', async () => {
    const initialPreferences = {
      user_id: 'u1',
      push_notifications: true,
      email_notifications: true,
      story_invites: true,
      story_turns: true,
      story_completed: true,
      story_likes: true,
      story_comments: true,
      friend_requests: true,
      friend_accepted: true,
      group_invites: true,
      group_updates: true,
    } as any;

    vi.spyOn(store, 'useStore').mockImplementation(() => ({
      currentUser: { id: 'u1', name: 'Jamie', avatar: '', tokens: 0, isPrivate: false },
      fetchFriends: vi.fn(),
      fetchSavedStories: vi.fn(),
      fetchStories: vi.fn(),
      savedStoryIds: [],
      setCurrentUser: vi.fn(),
      setProfileUpdateInProgress: vi.fn(),
      logoutUser: vi.fn(),
    }) as any);

    const maybeSingle = vi.fn().mockResolvedValueOnce({ data: initialPreferences, error: null });
    const eq = vi.fn().mockReturnValue({ maybeSingle });
    const select = vi.fn().mockReturnValue({ eq });

    // First upsert succeeds
    const upsertSuccess = vi.fn().mockResolvedValueOnce({ error: null });
    // Second upsert fails to test revert + toast
    const upsertFail = vi.fn().mockResolvedValueOnce({ error: { message: 'boom' } });

    // We'll return the same select for fetch but swap upsert implementation depending on calls
    const upsert = vi.fn()
      .mockImplementationOnce(upsertSuccess)
      .mockImplementationOnce(upsertFail);

    vi.spyOn(supabase as any, 'from').mockImplementation((...args: any[]) => {
      const table = args[0] as string;
      if (table === 'notification_preferences') return { select, upsert } as any;
      return {} as any;
    });

    // Toast removed


    const { default: NotificationsPage } = await import('./page');

    render(<NotificationsPage />);

    // wait for UI
    expect(await screen.findByText(/Push Notifications/i)).toBeInTheDocument();

    const pushLeft = screen.getByText(/Push Notifications/i).closest('div') as HTMLElement;
    const pushRow = pushLeft?.parentElement as HTMLElement;
    const pushButton = pushRow.querySelector('button') as HTMLElement;
    const pushInner = () => pushButton.querySelector('span') as HTMLElement;

    // Initially enabled
    const initialClass = pushInner().className;
    expect(initialClass).toContain('left-7');

    // Click to disable (first upsert succeeds)
    fireEvent.click(pushButton);

    await waitFor(() => expect(pushButton).not.toBeDisabled());

    // Re-query the button after re-render
    const pushRow2 = screen.getByText(/Push Notifications/i).closest('div')?.parentElement as HTMLElement;
    const pushButton2 = within(pushRow2).getByRole('button') as HTMLElement;

    // Click again to enable (second upsert will fail and revert)
    fireEvent.click(pushButton2);

    // Wait for the upsert to be called a second time and for an error toast to be shown
    await waitFor(() => expect(upsert).toHaveBeenCalledTimes(2));

  });
});
