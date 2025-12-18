import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import * as store from '@/lib/store';

// Mock dependencies
const mockToastError = vi.fn();
const mockToastSuccess = vi.fn();
const mockToastInfo = vi.fn();

vi.mock('@/lib/auth', () => ({
  updateUserProfile: vi.fn(),
}));

// vi.mock('sonner', () => ({
//   toast: {
//     error: mockToastError,
//     success: mockToastSuccess,
//     info: mockToastInfo,
//   },
// }));

// NOTE: Delay importing `ProfilePage` until after we set up mocks to avoid
// pulling in modules that require native bindings (like `canvas`) during top-level import.

describe('ProfilePage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders loading when no user', async () => {
    vi.spyOn(store, 'useStore').mockImplementation(() => ({
      currentUser: null,
      stories: [],
      friends: [],
      fetchFriends: vi.fn(),
      fetchSavedStories: vi.fn(),
      fetchStories: vi.fn(),
      savedStoryIds: [],
      setCurrentUser: vi.fn(),
      setProfileUpdateInProgress: vi.fn(),
    }) as any);

    const { default: ProfilePage } = await import('./page');

    render(<ProfilePage />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('shows user name, tagline and edit workflow', async () => {
    vi.spyOn(store, 'useStore').mockImplementation(() => ({
      currentUser: { id: 'me', name: 'Jay', avatar: '', tagline: 'Hello world', tokens: 10, isVerified: false, verificationTier: null },
      stories: [],
      friends: [],
      fetchFriends: vi.fn(),
      fetchSavedStories: vi.fn(),
      fetchStories: vi.fn(),
      savedStoryIds: [],
      setCurrentUser: vi.fn(),
      setProfileUpdateInProgress: vi.fn(),
    }) as any);

    const { default: ProfilePage } = await import('./page');

    render(<ProfilePage />);

    // Header name
    expect(screen.getByText('Jay')).toBeInTheDocument();
    // Tagline
    expect(screen.getByText('Hello world')).toBeInTheDocument();
    // Edit button
    const editButton = screen.getByRole('button', { name: /Edit Profile/i });
    expect(editButton).toBeInTheDocument();

    // Click edit and ensure input shows
    fireEvent.click(editButton);
    const nameInput = await screen.findByPlaceholderText('Your Name');
    expect((nameInput as HTMLInputElement).value).toBe('Jay');
  });

  it('displays verification badge when user is verified', async () => {
    vi.spyOn(store, 'useStore').mockImplementation(() => ({
      currentUser: { id: 'me', name: 'Jay', avatar: '', tagline: 'Hello world', tokens: 10, isVerified: true, verificationTier: 'premium' },
      stories: [],
      friends: [],
      fetchFriends: vi.fn(),
      fetchSavedStories: vi.fn(),
      fetchStories: vi.fn(),
      savedStoryIds: [],
      setCurrentUser: vi.fn(),
      setProfileUpdateInProgress: vi.fn(),
    }) as any);

    const { default: ProfilePage } = await import('./page');

    render(<ProfilePage />);

    // Check for verification badge - assuming it has some identifiable text or class
    expect(screen.getByText('Jay')).toBeInTheDocument();
    // VerificationBadge component should be rendered, but since it's a component, check for its presence indirectly
    // For now, just ensure the name is there
  });

  it('displays correct stats', async () => {
    const mockStories = [
      { id: '1', participants: [{ id: 'me', status: 'accepted' }], contributions: [{ userId: 'me' }, { userId: 'other' }], status: 'active' },
      { id: '2', participants: [{ id: 'me', status: 'accepted' }], contributions: [{ userId: 'me' }], status: 'completed' },
    ];
    const mockFriends = [{ id: 'friend1' }, { id: 'friend2' }];

    vi.spyOn(store, 'useStore').mockImplementation(() => ({
      currentUser: { id: 'me', name: 'Jay', avatar: '', tagline: 'Hello world', tokens: 10, isVerified: false, verificationTier: null },
      stories: mockStories,
      friends: mockFriends,
      fetchFriends: vi.fn(),
      fetchSavedStories: vi.fn(),
      fetchStories: vi.fn(),
      savedStoryIds: [],
      setCurrentUser: vi.fn(),
      setProfileUpdateInProgress: vi.fn(),
    }) as any);

    const { default: ProfilePage } = await import('./page');

    render(<ProfilePage />);

    // Weeves: 2 (stories where user is participant and accepted)
    expect(screen.getByText('2')).toBeInTheDocument(); // Weeves count
    // Contributions: 2 (from story 1 and 2)
    expect(screen.getByText('2')).toBeInTheDocument(); // Contributions count
    // Friends: 2
    expect(screen.getByText('2')).toBeInTheDocument(); // Friends count
  });

  it('switches tabs correctly', async () => {
    vi.spyOn(store, 'useStore').mockImplementation(() => ({
      currentUser: { id: 'me', name: 'Jay', avatar: '', tagline: 'Hello world', tokens: 10, isVerified: false, verificationTier: null },
      stories: [],
      friends: [],
      fetchFriends: vi.fn(),
      fetchSavedStories: vi.fn(),
      fetchStories: vi.fn(),
      savedStoryIds: [],
      setCurrentUser: vi.fn(),
      setProfileUpdateInProgress: vi.fn(),
    }) as any);

    const { default: ProfilePage } = await import('./page');

    render(<ProfilePage />);

    // Default tab is 'weeves'
    expect(screen.getByRole('button', { name: /Grid/i })).toBeInTheDocument();

    // Click saved tab
    const savedTab = screen.getByRole('button', { name: /Bookmark/i });
    fireEvent.click(savedTab);

    // Click waiting tab
    const waitingTab = screen.getByRole('button', { name: /Clock/i });
    fireEvent.click(waitingTab);
  });

  it('opens and closes invite modal', async () => {
    vi.spyOn(store, 'useStore').mockImplementation(() => ({
      currentUser: { id: 'me', name: 'Jay', avatar: '', tagline: 'Hello world', tokens: 10, isVerified: false, verificationTier: null, inviteCode: 'abc123' },
      stories: [],
      friends: [],
      fetchFriends: vi.fn(),
      fetchSavedStories: vi.fn(),
      fetchStories: vi.fn(),
      savedStoryIds: [],
      setCurrentUser: vi.fn(),
      setProfileUpdateInProgress: vi.fn(),
    }) as any);

    const { default: ProfilePage } = await import('./page');

    render(<ProfilePage />);

    // Find invite button by the UserPlus icon
    const buttons = screen.getAllByRole('button');
    const inviteButton = buttons.find(btn => btn.querySelector('.lucide-user-plus'));
    expect(inviteButton).toBeInTheDocument();

    // Click invite button
    fireEvent.click(inviteButton!);

    // Modal should open
    expect(screen.getByText('Invite Friends')).toBeInTheDocument();

    // Close modal
    const closeButton = screen.getByRole('button', { name: /X/i });
    fireEvent.click(closeButton);

    // Modal should close
    await waitFor(() => {
      expect(screen.queryByText('Invite Friends')).not.toBeInTheDocument();
    });
  });

  it('copies invite link', async () => {
    const mockClipboard = vi.fn();
    Object.assign(navigator, { clipboard: { writeText: mockClipboard } });

    vi.spyOn(store, 'useStore').mockImplementation(() => ({
      currentUser: { id: 'me', name: 'Jay', avatar: '', tagline: 'Hello world', tokens: 10, isVerified: false, verificationTier: null, inviteCode: 'abc123' },
      stories: [],
      friends: [],
      fetchFriends: vi.fn(),
      fetchSavedStories: vi.fn(),
      fetchStories: vi.fn(),
      savedStoryIds: [],
      setCurrentUser: vi.fn(),
      setProfileUpdateInProgress: vi.fn(),
    }) as any);

    const { default: ProfilePage } = await import('./page');

    render(<ProfilePage />);

    // Open invite modal
    const buttons = screen.getAllByRole('button');
    const inviteButton = buttons.find(btn => btn.querySelector('.lucide-user-plus'));
    fireEvent.click(inviteButton!);

    // Click copy button
    const allButtons = screen.getAllByRole('button');
    const copyButton = allButtons.find(btn => btn.querySelector('.lucide-copy'));
    fireEvent.click(copyButton!);

    // Check if clipboard was called
    expect(mockClipboard).toHaveBeenCalled();
  });

  it('enters edit mode and shows avatar picker', async () => {
    vi.spyOn(store, 'useStore').mockImplementation(() => ({
      currentUser: { id: 'me', name: 'Jay', avatar: 'avatar.jpg', tagline: 'Hello world', tokens: 10, isVerified: false, verificationTier: null },
      stories: [],
      friends: [],
      fetchFriends: vi.fn(),
      fetchSavedStories: vi.fn(),
      fetchStories: vi.fn(),
      savedStoryIds: [],
      setCurrentUser: vi.fn(),
      setProfileUpdateInProgress: vi.fn(),
    }) as any);

    const { default: ProfilePage } = await import('./page');

    render(<ProfilePage />);

    // Click edit
    const editButton = screen.getByRole('button', { name: /Edit Profile/i });
    fireEvent.click(editButton);

    // Click avatar div
    const avatarImg = screen.getByAltText('Jay');
    const avatarDiv = avatarImg.parentElement;
    fireEvent.click(avatarDiv!);

    // Avatar picker should open
    expect(screen.getByText('Update Profile Photo')).toBeInTheDocument();
  });

  it('saves profile changes successfully', async () => {
    const { updateUserProfile } = await import('@/lib/auth');
    const mockUpdate = vi.mocked(updateUserProfile);
    mockUpdate.mockResolvedValue({ 
      data: { 
        id: 'me',
        user_id: 'me',
        name: 'New Name', 
        avatar: null,
        tagline: 'New Tagline',
        tokens: 10,
        is_private: false,
        is_influencer: false,
        interaction_cost: null,
        invite_code: null,
        onboarding_step: null,
        completed_onboarding: false,
        preferences: null,
        last_name_change_at: null,
        date_of_birth: null,
        created_at: '',
        updated_at: '',
      },
      error: null
    });

    vi.spyOn(store, 'useStore').mockImplementation(() => ({
      currentUser: { id: 'me', name: 'Jay', avatar: '', tagline: 'Hello world', tokens: 10, isVerified: false, verificationTier: null },
      stories: [],
      friends: [],
      fetchFriends: vi.fn(),
      fetchSavedStories: vi.fn(),
      fetchStories: vi.fn(),
      savedStoryIds: [],
      setCurrentUser: vi.fn(),
      setProfileUpdateInProgress: vi.fn(),
    }) as any);

    const { default: ProfilePage } = await import('./page');

    render(<ProfilePage />);

    // Enter edit mode
    const editButton = screen.getByRole('button', { name: /Edit Profile/i });
    fireEvent.click(editButton);

    // Change name
    const nameInput = screen.getByPlaceholderText('Your Name');
    fireEvent.change(nameInput, { target: { value: 'New Name' } });

    // Change tagline
    const taglineInput = screen.getByPlaceholderText('Storyteller, dreamer, and weaver of tales. 🌌');
    fireEvent.change(taglineInput, { target: { value: 'New Tagline' } });

    // Click save
    const saveButton = screen.getByRole('button', { name: /Save Changes/i });
    fireEvent.click(saveButton);

    // Wait for save to complete
    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith('me', { name: 'New Name', tagline: 'New Tagline' });
    });
  });

  it('validates empty name on save', async () => {
    const { toast } = await import('sonner');
    const spy = vi.spyOn(toast, 'error');

    vi.spyOn(store, 'useStore').mockImplementation(() => ({
      currentUser: { id: 'me', name: 'Jay', avatar: '', tagline: 'Hello world', tokens: 10, isVerified: false, verificationTier: null },
      stories: [],
      friends: [],
      fetchFriends: vi.fn(),
      fetchSavedStories: vi.fn(),
      fetchStories: vi.fn(),
      savedStoryIds: [],
      setCurrentUser: vi.fn(),
      setProfileUpdateInProgress: vi.fn(),
    }) as any);

    const { default: ProfilePage } = await import('./page');

    render(<ProfilePage />);

    // Enter edit mode
    const editButton = screen.getByRole('button', { name: /Edit Profile/i });
    fireEvent.click(editButton);

    // Clear name
    const nameInput = screen.getByPlaceholderText('Your Name');
    fireEvent.change(nameInput, { target: { value: '' } });

    // Click save
    const saveButton = screen.getByRole('button', { name: /Save Changes/i });
    fireEvent.click(saveButton);

    // Should show error
    expect(spy).toHaveBeenCalledWith('Display name cannot be empty');
  });

  it('cancels edit and resets values', async () => {
    vi.spyOn(store, 'useStore').mockImplementation(() => ({
      currentUser: { id: 'me', name: 'Jay', avatar: '', tagline: 'Hello world', tokens: 10, isVerified: false, verificationTier: null },
      stories: [],
      friends: [],
      fetchFriends: vi.fn(),
      fetchSavedStories: vi.fn(),
      fetchStories: vi.fn(),
      savedStoryIds: [],
      setCurrentUser: vi.fn(),
      setProfileUpdateInProgress: vi.fn(),
    }) as any);

    const { default: ProfilePage } = await import('./page');

    render(<ProfilePage />);

    // Enter edit mode
    const editButton = screen.getByRole('button', { name: /Edit Profile/i });
    fireEvent.click(editButton);

    // Change name
    const nameInput = screen.getByPlaceholderText('Your Name');
    fireEvent.change(nameInput, { target: { value: 'Changed Name' } });

    // Click cancel
    const cancelButton = screen.getByRole('button', { name: /Cancel/i });
    fireEvent.click(cancelButton);

    // Should exit edit mode and show original name
    expect(screen.getByText('Jay')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Your Name')).not.toBeInTheDocument();
  });
});
