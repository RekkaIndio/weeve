import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as store from '@/lib/store';
import * as friendsModule from '@/lib/friends';

describe('DiscoverPage privacy behavior', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('does not show stories when the only matching participant is private and not a friend', async () => {
    vi.spyOn(store, 'useStore').mockImplementation(() => ({
      currentUser: { id: 'me', name: 'Me', isPrivate: false },
      stories: [
        {
          id: 's1',
          title: 'Hidden collab',
          description: 'A participant story',
          creatorId: '1',
          visibility: 'public',
          mode: 'invite',
          status: 'active',
          contributions: [],
          participants: [ { id: 'private1', name: 'Private Person', isPrivate: true } ],
          likes: 0,
          likedBy: [],
          comments: [],
        }
      ],
      groups: [],
      addGroup: vi.fn(),
      friends: [],
    }) as any);

    const { default: DiscoverPage } = await import('./page');

    render(<DiscoverPage />);

    const input = screen.getByPlaceholderText(/Search stories, people, tags/i);
    const user = userEvent.setup();
    await user.type(input, 'Private');

    // Wait for story to be removed from the results
    await waitFor(() => expect(screen.queryByText(/Hidden collab/i)).toBeNull());

    // Check a 'No stories found' message exists in the DOM
    expect(screen.getByText((content) => /no stories found/i.test(content))).toBeTruthy();
  });

  it('shows stories when the matching participant is a friend', async () => {
    vi.spyOn(store, 'useStore').mockImplementation(() => ({
      currentUser: { id: 'me', name: 'Me', isPrivate: false },
      stories: [
        {
          id: 's1',
          title: 'Hidden collab',
          description: 'A participant story',
          creatorId: '1',
          visibility: 'public',
          mode: 'invite',
          status: 'active',
          contributions: [],
          participants: [ { id: 'private1', name: 'Private Person', isPrivate: true } ],
          likes: 0,
          likedBy: [],
          comments: [],
        }
      ],
      groups: [],
      addGroup: vi.fn(),
      friends: [ { id: 'private1', name: 'Private Person' } ],
    }) as any);

    const { default: DiscoverPage } = await import('./page');

    render(<DiscoverPage />);

    const input = screen.getByPlaceholderText(/Search stories, people, tags/i);
    fireEvent.change(input, { target: { value: 'Private' } });

    // The story title should now be visible because the participant is a friend
    expect(await screen.findByText(/Hidden collab/i)).toBeInTheDocument();
  });

  it('shows public users when search yields no results', async () => {
    vi.spyOn(store, 'useStore').mockImplementation(() => ({
      currentUser: { id: 'me', name: 'Me', isPrivate: false },
      stories: [],
      groups: [],
      addGroup: vi.fn(),
      friends: [],
    }) as any);

    vi.spyOn(friendsModule, 'searchUsers').mockResolvedValueOnce([]);
    vi.spyOn(friendsModule, 'fetchPublicUsers').mockResolvedValueOnce([
      { id: 'pub1', name: 'Public Person', avatar: '', isFriend: false, isPrivate: false, friendRequestStatus: 'none' },
    ] as any);

    const { default: DiscoverPage } = await import('./page');

    render(<DiscoverPage />);

    // Switch to People tab
    const peopleBtn = screen.getByText(/People/i);
    fireEvent.click(peopleBtn);

    // Enter a query that has no matches
    const input = screen.getByPlaceholderText(/Search stories, people, tags/i);
    fireEvent.change(input, { target: { value: 'NoMatch123' } });

    // We should see the public user as a fallback
    expect(await screen.findByText(/Public Person/i)).toBeInTheDocument();
  });
});
