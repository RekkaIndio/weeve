export interface Friend {
  id: string;
  name: string;
  avatar?: string;
  isInfluencer?: boolean;
  interactionCost?: number;
  isFriend?: boolean;
  friendRequestStatus?: 'none' | 'pending_sent' | 'pending_received' | 'accepted';
}

export interface StorySlot {
  id: string; // Unique stable ID for Framer Motion key
  friend: Friend | null;
}

export interface CreateStoryFormState {
  title: string;
  description: string;
  visibility: "public" | "private";
  selectedFriends: Friend[];
  orderedParticipants?: (Friend | null)[];

  inviteCount: number; // number of invite slots (1-10)
  hashtags?: string[];
  allowComments: boolean;
  turnTimerHours?: number;
  monetizationCost?: number;
  // Brand post fields
  postType?: 'normal' | 'canon' | 'seed';
  canonSlots?: number[]; // Array of immutable slot indices (0-indexed)
  visibilityDays?: number; // Brand post visibility duration (1, 3, 7, 14 days)
  scheduledFor?: string; // ISO date string for scheduled posts
  productUrl?: string; // Product URL for brand posts

  // Public story slot selection fields
  selectedSlotIndices?: number[]; // For public stories: which slots the creator selected to fill
  slotMedia?: Record<number, {
    type: 'video' | 'image' | 'text' | 'drawing' | 'audio';
    url: string;
    thumbnailUrl?: string;
  }>; // Media uploaded for each selected slot
}
