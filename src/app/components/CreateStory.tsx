"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, Loader, Globe, Lock, UserPlus, Check, X, Type, AlignLeft, Users, Hash } from "lucide-react";
import { Reorder, useDragControls } from "framer-motion";
import NotificationBell from "./NotificationBell";
import { searchUsers, addFriend, sendFriendRequest } from "@/lib/friends";
import { searchHashtags } from "@/lib/hashtags";
import { toast } from "sonner";
import { getPrice, formatPrice, getAvailableSlotCounts } from "@/lib/brand-pricing";
import { getPaymentLink } from "@/lib/stripe-payment-links";

export interface Friend {
  id: string;
  name: string;
  avatar?: string;
  isInfluencer?: boolean;
  interactionCost?: number;
  isFriend?: boolean;
  friendRequestStatus?: 'none' | 'pending_sent' | 'pending_received' | 'accepted';
}

interface StorySlot {
  id: string; // Unique stable ID for Framer Motion key
  friend: Friend | null;
}

const generateId = () => Math.random().toString(36).substr(2, 9);

// Extracted Slot Component for DragControls
const StorySlotItem = ({
  slot,
  index,
  isCurrentUser,
  onRemove,
  onFill,
  isLast,
  isReordering,
  isLocked = false
}: {
  slot: StorySlot;
  index: number;
  isCurrentUser: boolean;
  onRemove: (id: string, idx: number) => void;
  onFill: (idx: number) => void;
  isLast: boolean;
  isReordering: boolean;
  isLocked?: boolean;
}) => {
  const controls = useDragControls();
  const participant = slot.friend;
  const isEmpty = !participant;

  return (
    <Reorder.Item
      value={slot}
      dragListener={isReordering} // Only drag when Reorder Mode is active
      dragControls={controls}
      className="flex items-start relative group"
      style={{ touchAction: isReordering ? "none" : "pan-x" }}
    >
      <div
        className={`flex flex-col items-center transition-all duration-200 relative ${isReordering ? "animate-pulse" : ""}`}
      >
        {/* Avatar/Slot Circle */}
        <div
          onClick={() => {
            if (isEmpty && !isReordering && !isLocked) onFill(index);
          }}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-all select-none relative bg-gray-800 ${isLocked
              ? "ring-2 ring-gray-600 cursor-not-allowed opacity-75"
              : isReordering && participant
                ? "ring-2 ring-yellow-400 cursor-grab active:cursor-grabbing transform scale-105"
                : participant
                  ? "ring-2 ring-[#EC1D99] ring-offset-2 ring-offset-black"
                  : "cursor-pointer hover:scale-105"
            }`}
        >
          {participant ? (
            <img
              src={participant.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(participant.name)}`}
              alt={participant.name}
              className="w-full h-full object-cover rounded-full pointer-events-none select-none"
              draggable={false}
            />
          ) : (
            <div className="w-full h-full rounded-full border-2 border-dashed border-gray-600 group-hover:border-[#EC1D99]/50 transition-colors flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-gray-600 group-hover:text-[#EC1D99]/70 transition-colors" />
            </div>
          )}

          {/* Remove Button (Hide during reorder or if locked) */}
          {participant && !isReordering && !isLocked && (
            <div
              className="absolute -bottom-1 -right-1 w-5 h-5 bg-red-500/80 rounded-full flex items-center justify-center cursor-pointer z-10 hidden group-hover:flex"
              onClick={(e) => {
                e.stopPropagation();
                onRemove(participant.id, index);
              }}
            >
              <X className="w-3 h-3 text-white" />
            </div>
          )}

          {/* Lock Icon for locked slots */}
          {isLocked && (
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-gray-600 rounded-full flex items-center justify-center z-10">
              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
          )}

        </div>

        {/* Remove via main click (disabled if locked) */}
        {participant && !isReordering && !isLocked && (
          <button
            className="absolute inset-0 w-full h-full opacity-0 z-0"
            onClick={() => onRemove(participant.id, index)}
            aria-label="Remove participant"
          />
        )}


        {/* Label with turn number */}
        <div className="flex flex-col items-center mt-2 pointer-events-none">
          <span className={`text-[10px] uppercase font-bold tracking-wider ${participant ? "text-[#EC1D99]" : "text-gray-600"}`}>
            #{index + 1}
          </span>
          <span className={`text-xs text-center font-medium max-w-[64px] truncate mt-0.5 ${participant ? "text-white" : "text-gray-500"
            }`}>
            {participant
              ? (isCurrentUser ? "You" : participant.name.split(" ")[0])
              : "Empty"
            }
          </span>
        </div>
      </div>

      {/* Connector line */}
      {!isLast && (
        <div className="h-14 w-8 flex items-center justify-center flex-shrink-0">
          <div className="w-full h-0.5 bg-gray-700 rounded-full" />
        </div>
      )}
    </Reorder.Item>
  );
};

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
    type: 'video' | 'image' | 'text' | 'drawing';
    url: string;
    thumbnailUrl?: string;
  }>; // Media uploaded for each selected slot
}

interface CreateStoryProps {
  onBack?: () => void;
  onCreateStory: (data: CreateStoryFormState) => Promise<string>; // Returns story ID
  availableFriends?: Friend[];
  currentUser?: {
    id: string;
    name: string;
    avatar?: string;
    tokens: number;
    isInfluencer?: boolean;
    // Brand account fields
    isBrand?: boolean;
    brandSubscriptionStatus?: 'none' | 'active' | 'expired';
  };
  onDeductTokens?: (amount: number) => boolean;
  groupId?: string;
  groupName?: string;
  groupAvatar?: string;
  onRefreshFriends?: () => Promise<void>;
}

const CreateStory = ({
  onBack,
  onCreateStory,
  availableFriends = [],
  currentUser,
  onDeductTokens,
  groupId,
  groupName,
  groupAvatar,
  onRefreshFriends,
}: CreateStoryProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteId = searchParams?.get('invite');

  const handleBack = onBack ?? (() => router.back());

  // Initialize slots - creator is ALWAYS in slot 1 (index 0)
  const [slots, setSlots] = useState<StorySlot[]>(() => {
    // Start with 2 empty slots (based on default inviteCount=1 -> 2 total slots)
    const initialParticipants = Array(2).fill(null);

    return initialParticipants.map((_, index) => ({
      id: generateId(),
      // Creator is always in first slot
      friend: index === 0 && currentUser ? {
        id: currentUser.id,
        name: currentUser.name,
        avatar: currentUser.avatar
      } : null
    }));
  });

  const [formState, setFormState] = useState<CreateStoryFormState>({
    title: "",
    description: "",
    visibility: "private",
    selectedFriends: [],
    // orderedParticipants will be derived from slots on submit, but we keep it here for compatibility if needed or ignore it.
    // We'll update it inside the component just in case other logic depends on it (though we plan to refactor).
    orderedParticipants: slots.map(s => s.friend),

    inviteCount: 1,
    hashtags: [],
    allowComments: true,
    turnTimerHours: undefined,
    monetizationCost: undefined,
    // Brand post fields - default to normal for non-brand users
    postType: 'normal',
    canonSlots: [],
  });

  // Sync slots to orderedParticipants in formState whenever slots change (optional but good for consistency)
  useEffect(() => {
    setFormState(prev => ({
      ...prev,
      orderedParticipants: slots.map(s => s.friend)
    }));
  }, [slots]);

  const [hashtagInput, setHashtagInput] = useState("");
  const hashtagInputRef = useRef<HTMLInputElement | null>(null);
  const [hashtagSuggestions, setHashtagSuggestions] = useState<string[]>([]);
  const [showHashtagDropdown, setShowHashtagDropdown] = useState(false);
  const [isSearchingHashtags, setIsSearchingHashtags] = useState(false);
  const friendsInputRef = useRef<HTMLInputElement | null>(null);
  const titleInputRef = useRef<HTMLInputElement | null>(null);
  const errorTimeoutRef = useRef<number | null>(null);
  const topRef = useRef<HTMLDivElement | null>(null);
  const participantsRef = useRef<HTMLDivElement | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const loadingStartTimeRef = useRef<number | null>(null);
  // const [isIOS, setIsIOS] = useState(false); // Removed as per request to unify behavior

  // Safety mechanism: Reset stuck loading state when app resumes from background
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isLoading) {
        // Check for timeout - if loading for more than 2 minutes, assume something went wrong
        const LOADING_TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes
        if (loadingStartTimeRef.current && Date.now() - loadingStartTimeRef.current > LOADING_TIMEOUT_MS) {
          console.warn('[CreateStory] Loading has been stuck for over 2 minutes. Resetting state.');
          setIsLoading(false);
          setError('Request timed out. Please try again.');
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
    };
  }, [isLoading]);

  useEffect(() => {
    // Check if running on iOS client-side -- NO LONGER USED FOR DRAG but maybe keep for other logic? 
    // User requested removing grip meaning we treat iOS same as Android regarding drag.
    // Keeping this commented out or removing if only used for that.
  }, []);
  const [error, setError] = useState("");
  const [friendSearchInput, setFriendSearchInput] = useState("");
  const [showFriendDropdown, setShowFriendDropdown] = useState(false);
  const [slotToFill, setSlotToFill] = useState<number | null>(null);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [isReordering, setIsReordering] = useState(false);

  // For public stories with slot selection, track which slots the creator wants to fill
  // Initialize with [0] since creator is always in slot 1
  const [selectedSlotIndices, setSelectedSlotIndices] = useState<number[]>([0]);
  const [slotMedia, setSlotMedia] = useState<Record<number, {
    type: 'video' | 'image' | 'text' | 'drawing';
    url: string;
    thumbnailUrl?: string;
  }>>({});
  const [uploadingSlotIndex, setUploadingSlotIndex] = useState<number | null>(null);

  // Handle invite query param
  useEffect(() => {
    if (inviteId && availableFriends.length > 0) {
      const friendToInvite = availableFriends.find(f => f.id === inviteId);
      if (friendToInvite) {
        // Add to first available slot
        setSlots(prevSlots => {
          const newSlots = [...prevSlots];
          const emptyIndex = newSlots.findIndex(s => s.friend === null);
          if (emptyIndex !== -1) {
            newSlots[emptyIndex] = { ...newSlots[emptyIndex], friend: friendToInvite };
          } else {
            // If full, do we expand? The original code didn't explicitly expand here unless inviteCount was handling it, 
            // but here we just fill if empty.
          }
          return newSlots;
        });

        // Also update selectedFriends in formState
        setFormState(prev => {
          const isAlreadySelected = prev.selectedFriends.some(f => f.id === friendToInvite.id);
          if (!isAlreadySelected) {
            return {
              ...prev,
              selectedFriends: [...prev.selectedFriends, friendToInvite]
            }
          }
          return prev;
        })
      }
    }
  }, [inviteId, availableFriends]);

  // Make sure timers get cleared on unmount
  useEffect(() => {
    return () => {
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
      }
    };
  }, []);

  const [searchResults, setSearchResults] = useState<Friend[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Filter available friends based on search input (including current user)
  const allAvailableFriends = currentUser
    ? [{ id: currentUser.id, name: currentUser.name, avatar: currentUser.avatar }, ...availableFriends]
    : availableFriends;

  // Compute local filtered friends instantly (no debounce)
  const localFilteredFriends = friendSearchInput.trim()
    ? allAvailableFriends.filter((friend) =>
      friend.name.toLowerCase().includes(friendSearchInput.toLowerCase())
    )
    : allAvailableFriends;

  // Debug logging
  useEffect(() => {

  }, [availableFriends]);

  // Debounced remote search
  useEffect(() => {
    const search = async () => {
      if (!friendSearchInput.trim() || !currentUser) {
        setSearchResults([]);
        setIsSearching(false);
        return;
      }

      // Only show searching if we have no local results
      if (localFilteredFriends.length === 0) {
        setIsSearching(true);
      }

      try {
        // Remote search
        const remoteMatches = await searchUsers(friendSearchInput, currentUser.id);

        // Merge with local results and deduplicate
        const combined = [...localFilteredFriends];
        remoteMatches.forEach(remote => {
          if (!combined.some(local => local.id === remote.id)) {
            combined.push(remote);
          }
        });

        setSearchResults(combined);
        setIsSearching(false);
      } catch (err) {
        console.error("Search failed", err);
        setIsSearching(false);
      }
    };

    const timeoutId = setTimeout(search, 400);
    return () => clearTimeout(timeoutId);
  }, [friendSearchInput, currentUser]);

  // Final list to display: local results immediately, then enhanced with remote results
  const filteredFriends = friendSearchInput.trim()
    ? (searchResults.length > 0 ? searchResults : localFilteredFriends)
    : allAvailableFriends;

  // Handle title input change
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.slice(0, 60); // Max 60 characters
    setFormState((prev) => ({ ...prev, title: value }));
    setError("");
  };

  // Handle description input change
  const handleDescriptionChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>,
  ) => {
    const value = e.target.value.slice(0, 200); // Max 200 characters
    setFormState((prev) => ({ ...prev, description: value }));
  };

  // Handle visibility selection change
  const handleVisibilityChange = (visibility: "public" | "private") => {
    setFormState((prev) => ({
      ...prev,
      visibility,
    }));
    setError("");
  };

  // Handle post type change (for brand accounts)
  const handlePostTypeChange = (postType: 'normal' | 'canon' | 'seed') => {
    setFormState((prev) => ({
      ...prev,
      postType,
      // Seed mode automatically sets slot 0 as immutable
      canonSlots: postType === 'seed' ? [0] : (postType === 'normal' ? [] : prev.canonSlots),
      // Brand posts are always public
      visibility: postType !== 'normal' ? 'public' : prev.visibility,
    }));
    setError("");
  };

  // Handle canon slot toggle (for Canon mode)
  const handleToggleCanonSlot = (slotIndex: number) => {
    setFormState((prev) => {
      const currentSlots = prev.canonSlots || [];
      const isSelected = currentSlots.includes(slotIndex);
      return {
        ...prev,
        canonSlots: isSelected
          ? currentSlots.filter(i => i !== slotIndex)
          : [...currentSlots, slotIndex].sort((a, b) => a - b),
      };
    });
  };

  // Handle adding a friend
  const handleAddFriend = async (friend: Friend) => {
    // Check for influencer cost
    if (friend.isInfluencer && friend.interactionCost) {
      if (!onDeductTokens) {
        setError("Unable to process transaction.");
        return;
      }

      const success = onDeductTokens(friend.interactionCost);
      if (!success) {
        setError(`Not enough tokens! You need ${friend.interactionCost} tokens to add ${friend.name}.`);
        if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
        errorTimeoutRef.current = window.setTimeout(() => setError(""), 3000);
        return;
      }
    }


    // If not a friend yet, add them
    if (friend.isFriend === false && currentUser) {
      try {
        await addFriend(currentUser.id, friend.id);
        toast.success(`Added ${friend.name} as a friend!`);
      } catch (err) {
        console.error("Failed to add friend", err);
        toast.error("Failed to add friend connection");
      }
    }

    let inserted = false;
    const newSlots = [...slots];

    // If slotToFill is set, place friend into that slot
    if (slotToFill !== null && slotToFill < newSlots.length) {
      newSlots[slotToFill] = { ...newSlots[slotToFill], friend };
      inserted = true;
    } else {
      // Find first empty slot
      const emptyIndex = newSlots.findIndex(s => s.friend === null);
      if (emptyIndex !== -1) {
        newSlots[emptyIndex] = { ...newSlots[emptyIndex], friend };
        inserted = true;
      }
    }

    if (!inserted) {
      setError(`Story is full. Increase the participant count to add more friends.`);
      if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
      errorTimeoutRef.current = window.setTimeout(() => setError(""), 2000);
      return;
    }

    setSlots(newSlots);

    // Rebuild selectedFriends
    const newSelectedFriends = newSlots
      .map(s => s.friend)
      .filter((p): p is Friend => p !== null && p.id !== currentUser?.id);

    setFormState(prev => ({
      ...prev,
      selectedFriends: newSelectedFriends
    }));

    setSlotToFill(null);
    setFriendSearchInput("");
    setShowFriendDropdown(false);
  };

  // Handle removing a friend
  const handleRemoveFriend = (friendId: string, slotIndex?: number) => {

    setSlots(currentSlots => {
      const newSlots = [...currentSlots];

      // If slotIndex is provided, remove from that specific slot
      if (slotIndex !== undefined && slotIndex < newSlots.length) {
        newSlots[slotIndex] = { ...newSlots[slotIndex], friend: null };
      } else {
        const index = newSlots.findIndex(s => s.friend && s.friend.id === friendId);
        if (index !== -1) {
          newSlots[index] = { ...newSlots[index], friend: null };
        }
      }

      // Sync selectedFriends in formState
      const newSelectedFriends = newSlots
        .map(s => s.friend)
        .filter((p): p is Friend => p !== null && p.id !== currentUser?.id);

      setFormState(prev => ({ ...prev, selectedFriends: newSelectedFriends }));

      return newSlots;
    });
  };

  // Handle form submission
  const handleCreateStory = async () => {
    // Validation
    if (formState.title.trim().length === 0) {
      setError("Story title is required");
      if (titleInputRef.current) {
        titleInputRef.current.focus();
        titleInputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    const activeParticipants = slots.map(s => s.friend).filter(p => p !== null);

    // Determine story type first
    const isBrandPost = formState.postType === 'canon' || formState.postType === 'seed';
    const isPublicStoryWithSlotSelection = formState.visibility === 'public' && !isBrandPost;

    // Check if current user is in at least one slot
    const userInSlots = slots.some(s => s.friend?.id === currentUser?.id);
    if (!userInSlots && !isBrandPost) {
      setError("You must add yourself to at least one slot");
      if (participantsRef.current) {
        participantsRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    // Validation logic differs based on story type:
    // 1. Brand posts (Canon/Seed): empty slots allowed (they are open for public)
    // 2. Public stories with slot selection: creator must select slots and upload media
    // 3. Private stories: all slots must be filled with invited friends

    if (isPublicStoryWithSlotSelection) {
      // Public story validation: must select at least 1 slot
      // Media will be added after creation using existing contribution flow
      if (selectedSlotIndices.length === 0) {
        setError("Please select at least one slot to fill for your public story");
        if (participantsRef.current) {
          participantsRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        return;
      }
    } else if (!isBrandPost) {
      // Private story validation: all slots must be filled with invited friends
      if (activeParticipants.length !== slots.length) {
        setError("Please fill all empty slots before creating the story");
        if (participantsRef.current) {
          participantsRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        return;
      }
    }

    // Check if brand post requires payment
    const requiresPayment = isBrandPost && formState.visibilityDays;

    if (isBrandPost && !formState.visibilityDays) {
      setError("Please select a visibility duration for your brand post");
      if (participantsRef.current) {
        participantsRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    setIsLoading(true);
    loadingStartTimeRef.current = Date.now();
    setError("");

    try {
      // Construct the data expected by parent from our slots
      const submissionData: CreateStoryFormState = {
        ...formState,
        orderedParticipants: slots.map(s => s.friend),
        // Include slot selection data for public stories
        selectedSlotIndices: isPublicStoryWithSlotSelection ? selectedSlotIndices : undefined,
      };

      // Create the story and get the story ID
      const storyId = await onCreateStory(submissionData);

      // For brand posts requiring payment, redirect to Stripe
      if (requiresPayment && formState.visibilityDays) {
        const paymentLink = getPaymentLink(
          formState.postType as 'seed' | 'canon',
          formState.visibilityDays,
          storyId
        );

        if (paymentLink) {
          // Redirect to Stripe payment page
          window.location.href = paymentLink;
          // Note: loading state will persist during redirect, which is desired
        } else {
          setError("Payment configuration error. Please contact support.");
          setIsLoading(false);
        }
      }
      // For normal posts, onCreateStory already handles the redirect

    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to create story. Please try again.",
      );
      if (topRef.current) {
        topRef.current.scrollIntoView({ behavior: 'smooth' });
      }
      setIsLoading(false);
      loadingStartTimeRef.current = null;
    }
  };

  const normalizeTag = (tag: string) => {
    return tag.trim().replace(/^#+/, "").replace(/\s+/g, "").toLowerCase();
  };

  const handleAddHashtag = (rawTag?: string) => {
    const t = rawTag ?? hashtagInput;
    const val = normalizeTag(t);
    if (!val) return;
    if (val.length > 30) {
      setError("Hashtag cannot be longer than 30 characters.");
      if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
      errorTimeoutRef.current = window.setTimeout(() => setError(""), 2000);
      return;
    }
    const existing = formState.hashtags ?? [];
    if (existing.includes(val)) {
      setError("Hashtag already added.");
      if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
      errorTimeoutRef.current = window.setTimeout(() => setError(""), 2000);
      return;
    }
    if (existing.length >= 10) {
      setError("You can only add up to 10 hashtags.");
      if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
      errorTimeoutRef.current = window.setTimeout(() => setError(""), 2000);
      return;
    }
    setFormState((prev) => ({
      ...prev,
      hashtags: [...(prev.hashtags ?? []), val],
    }));
    setHashtagInput("");
  };

  const handleRemoveHashtag = (tag: string) => {
    setFormState((prev) => ({
      ...prev,
      hashtags: (prev.hashtags ?? []).filter((t) => t !== tag),
    }));
  };

  // Debounced hashtag search
  useEffect(() => {
    const searchForHashtags = async () => {
      const normalizedInput = hashtagInput.trim().replace(/^#+/, '').toLowerCase();

      if (!normalizedInput) {
        setHashtagSuggestions([]);
        setIsSearchingHashtags(false);
        return;
      }

      setIsSearchingHashtags(true);
      try {
        const results = await searchHashtags(normalizedInput, 10);
        // Filter out already selected hashtags
        const existingTags = formState.hashtags ?? [];
        const filtered = results.filter(tag => !existingTags.includes(tag));
        setHashtagSuggestions(filtered);
      } catch (err) {
        console.error('Hashtag search failed', err);
        setHashtagSuggestions([]);
      } finally {
        setIsSearchingHashtags(false);
      }
    };

    const timeoutId = setTimeout(searchForHashtags, 300);
    return () => clearTimeout(timeoutId);
  }, [hashtagInput, formState.hashtags]);

  const handleSelectHashtagSuggestion = (tag: string) => {
    handleAddHashtag(tag);
    setShowHashtagDropdown(false);
    setHashtagSuggestions([]);
  };

  // Removed HTML5 drag handlers as we switched to Reorder

  // Render Section 1: Story Details
  const renderDetailsSection = () => (
    <div className="space-y-6">
      <div className="text-left mb-4">
        <h2 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
          <Type className="w-5 h-5 text-[#EC1D99]" />
          Story Details
        </h2>
        <p className="text-gray-400 text-sm">Give your story a name and description</p>
      </div>

      {/* Story Title Input */}
      <div>
        <label
          htmlFor="title"
          className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2 font-sans pl-1"
        >
          Story Title <span className="text-[#EC1D99]">*</span>
        </label>
        <div className="relative group">
          <input
            id="title"
            type="text"
            value={formState.title}
            ref={titleInputRef}
            onChange={handleTitleChange}
            placeholder="Give your story a name..."
            className="w-full px-4 py-4 pl-11 bg-gray-800/50 border border-gray-700/50 rounded-2xl focus:outline-none focus:border-[#EC1D99] focus:ring-4 focus:ring-[#EC1D99]/10 transition-all text-white text-lg font-semibold placeholder-gray-500 font-sans backdrop-blur-sm"
            aria-describedby="title-counter"
          />
          <Type className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-[#EC1D99] transition-colors" />
        </div>
        <p
          className="text-xs text-gray-500 mt-2 font-sans text-right px-1"
          id="title-counter"
        >
          {formState.title.length}/60
        </p>
      </div>

      {/* Story Description Input */}
      <div>
        <label
          htmlFor="description"
          className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2 font-sans pl-1"
        >
          Description <span className="text-gray-500 font-normal normal-case ml-1">(Optional)</span>
        </label>
        <div className="relative group">
          <textarea
            id="description"
            value={formState.description}
            onChange={handleDescriptionChange}
            rows={3}
            placeholder="What's this story about? Set the scene for your collaborators..."
            className="w-full px-4 py-4 pl-11 bg-gray-800/50 border border-gray-700/50 rounded-2xl focus:outline-none focus:border-[#EC1D99] focus:ring-4 focus:ring-[#EC1D99]/10 transition-all text-white resize-none placeholder-gray-500 font-sans backdrop-blur-sm leading-relaxed"
            aria-describedby="desc-counter"
          />
          <AlignLeft className="absolute left-4 top-5 w-5 h-5 text-gray-500 group-focus-within:text-[#EC1D99] transition-colors" />
        </div>
        <p
          className="text-xs text-gray-500 mt-2 text-right px-1"
          id="desc-counter"
        >
          {formState.description.length}/200
        </p>
      </div>
      {/* Hashtags Input moved from Settings */}
      <div className="relative">
        <label
          htmlFor="hashtag"
          className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2 font-sans pl-1"
        >
          Hashtags <span className="text-gray-500 font-normal normal-case ml-1">(Optional)</span>
        </label>
        <div className="flex gap-2 items-center relative">
          <div className="relative flex-1 group">
            <input
              id="hashtag"
              type="text"
              value={hashtagInput}
              onChange={(e) => setHashtagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === "," || e.key === " ") {
                  e.preventDefault();
                  handleAddHashtag();
                }
                if (e.key === "Escape") {
                  setShowHashtagDropdown(false);
                }
                if (e.key === "ArrowDown" && hashtagSuggestions.length > 0) {
                  e.preventDefault();
                  setShowHashtagDropdown(true);
                }
              }}
              onFocus={() => setShowHashtagDropdown(true)}
              onBlur={() => {
                // Delay to allow click on dropdown
                setTimeout(() => setShowHashtagDropdown(false), 200);
              }}
              placeholder="#adventure #friends"
              className="w-full px-4 py-4 pl-11 bg-gray-800/50 border border-gray-700/50 rounded-2xl focus:outline-none focus:border-[#EC1D99] focus:ring-4 focus:ring-[#EC1D99]/10 transition-all text-white placeholder-gray-500 font-sans backdrop-blur-sm"
              ref={hashtagInputRef}
              autoComplete="off"
            />
            <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-[#EC1D99] transition-colors" />

            {/* Hashtag Suggestions Dropdown */}
            {showHashtagDropdown && (hashtagSuggestions.length > 0 || isSearchingHashtags) && (
              <div className="absolute left-0 right-0 top-full mt-2 bg-gray-900 border border-gray-800 rounded-xl shadow-2xl z-50 max-h-48 overflow-y-auto ring-1 ring-white/10">
                {isSearchingHashtags && (
                  <div className="flex items-center justify-center py-3 text-gray-500 text-sm">
                    <Loader className="w-4 h-4 animate-spin mr-2" />
                    Searching...
                  </div>
                )}
                {!isSearchingHashtags && hashtagSuggestions.length > 0 && (
                  <>
                    <div className="px-3 py-2 text-xs text-gray-500 border-b border-gray-800">
                      Existing hashtags
                    </div>
                    {hashtagSuggestions.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handleSelectHashtagSuggestion(tag);
                        }}
                        className="w-full px-3 py-2.5 text-left text-white hover:bg-gray-800 transition-colors flex items-center gap-2"
                      >
                        <span className="text-[#EC1D99]">#</span>
                        <span>{tag}</span>
                      </button>
                    ))}
                  </>
                )}
                {!isSearchingHashtags && hashtagSuggestions.length === 0 && hashtagInput.trim() && (
                  <div className="px-3 py-3 text-gray-500 text-sm text-center">
                    No matching hashtags found. Press Enter to create a new one.
                  </div>
                )}
              </div>
            )}
          </div>
          <button
            onClick={() => handleAddHashtag()}
            className="px-6 py-4 rounded-2xl bg-[#EC1D99] text-white font-bold hover:bg-[#D41C84] transition-colors shadow-lg shadow-[#EC1D99]/20"
          >
            Add
          </button>
        </div>

        {/* Hashtag Chips */}
        {formState.hashtags && formState.hashtags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {formState.hashtags.map((tag) => (
              <div
                key={tag}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-800/50 text-gray-200 rounded-full text-sm border border-gray-700/50 group hover:border-[#EC1D99]/50 transition-colors"
              >
                <span>#{tag}</span>
                <button
                  onClick={() => handleRemoveHashtag(tag)}
                  className="text-gray-500 hover:text-white transition-colors font-bold group-hover:text-red-400"
                  aria-label={`Remove ${tag}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div >
  );



  // Render Section 2: Contributors
  const renderContributorsSection = () => (
    <div className="space-y-6 overflow-visible" ref={participantsRef}>
      <div className="text-left mb-6">
        <h2 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
          <Users className="w-5 h-5 text-[#EC1D99]" />
          Participants
        </h2>
        <p className="text-gray-400 text-sm">Choose who can add to this story</p>
      </div>

      {/* Story Visibility Selection - Hidden if groupId is present */}
      {!groupId && (
        <fieldset aria-labelledby="story-visibility-legend">
          <legend
            id="story-visibility-legend"
            className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2 font-sans pl-1"
          >
            {currentUser?.isBrand ? 'Post Type' : 'Visibility'}
          </legend>

          {/* Brand Post Type Selector (Canon/Seed) */}
          {currentUser?.isBrand ? (
            <div className="space-y-2">
              <div className="flex gap-2">
                {/* Option 1: Normal (Public) */}
                <div
                  onClick={() => handlePostTypeChange("normal")}
                  className={`flex-1 flex items-center gap-2 p-2.5 rounded-xl cursor-pointer transition-all border ${formState.postType === "normal" ? "bg-[#EC1D99]/10 border-[#EC1D99]" : "bg-gray-800/50 border-gray-700/50 hover:border-gray-600"}`}
                >
                  <div className={`p-1.5 rounded-lg ${formState.postType === "normal" ? "bg-[#EC1D99] text-white" : "bg-gray-700 text-gray-400"}`}>
                    <Globe className="w-4 h-4" />
                  </div>
                  <div>
                    <label className={`text-xs font-bold cursor-pointer block ${formState.postType === "normal" ? "text-white" : "text-gray-300"}`}>
                      Normal
                    </label>
                    <p className="text-[10px] text-gray-500">Standard post</p>
                  </div>
                </div>

                {/* Option 2: Seed Mode */}
                <div
                  onClick={() => {
                    if (currentUser?.brandSubscriptionStatus === 'active') {
                      handlePostTypeChange("seed");
                    } else {
                      // Show upgrade prompt
                      window.location.href = '/settings/subscription';
                    }
                  }}
                  className={`flex-1 flex items-center gap-2 p-2.5 rounded-xl transition-all border relative
                    ${currentUser?.brandSubscriptionStatus !== 'active' ? 'cursor-pointer' : 'cursor-pointer'}
                    ${formState.postType === "seed" ? "bg-green-500/10 border-green-500" : "bg-gray-800/50 border-gray-700/50 hover:border-gray-600"}`}
                >
                  {currentUser?.brandSubscriptionStatus !== 'active' && (
                    <div className="absolute -top-1 -right-1 text-[8px] bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-1.5 py-0.5 rounded-full font-bold">
                      PRO
                    </div>
                  )}
                  <div className={`p-1.5 rounded-lg ${formState.postType === "seed" ? "bg-green-500 text-white" : "bg-gray-700 text-gray-400"}`}>
                    <span className="text-sm">🌱</span>
                  </div>
                  <div>
                    <label className={`text-xs font-bold cursor-pointer block ${formState.postType === "seed" ? "text-white" : "text-gray-300"}`}>
                      Seed
                    </label>
                    <p className="text-[10px] text-gray-500">Slot 1 locked</p>
                  </div>
                </div>

                {/* Option 3: Canon Mode */}
                <div
                  onClick={() => {
                    if (currentUser?.brandSubscriptionStatus === 'active') {
                      handlePostTypeChange("canon");
                    } else {
                      // Show upgrade prompt
                      window.location.href = '/settings/subscription';
                    }
                  }}
                  className={`flex-1 flex items-center gap-2 p-2.5 rounded-xl transition-all border relative
                    ${currentUser?.brandSubscriptionStatus !== 'active' ? 'cursor-pointer' : 'cursor-pointer'}
                    ${formState.postType === "canon" ? "bg-purple-500/10 border-purple-500" : "bg-gray-800/50 border-gray-700/50 hover:border-gray-600"}`}
                >
                  {currentUser?.brandSubscriptionStatus !== 'active' && (
                    <div className="absolute -top-1 -right-1 text-[8px] bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-1.5 py-0.5 rounded-full font-bold">
                      PRO
                    </div>
                  )}
                  <div className={`p-1.5 rounded-lg ${formState.postType === "canon" ? "bg-purple-500 text-white" : "bg-gray-700 text-gray-400"}`}>
                    <span className="text-sm">🎬</span>
                  </div>
                  <div>
                    <label className={`text-xs font-bold cursor-pointer block ${formState.postType === "canon" ? "text-white" : "text-gray-300"}`}>
                      Canon
                    </label>
                    <p className="text-[10px] text-gray-500">Lock any slot</p>
                  </div>
                </div>
              </div>

              {/* Upgrade prompt for non-premium brands */}
              {currentUser?.brandSubscriptionStatus !== 'active' && (
                <a
                  href="/settings/subscription"
                  className="block text-center text-xs text-yellow-400 hover:text-yellow-300 transition-colors py-1"
                >
                  ✨ Upgrade to unlock Seed & Canon posts
                </a>
              )}

              {/* Visibility Duration & Pricing for Seed/Canon posts */}
              {(formState.postType === 'seed' || formState.postType === 'canon') && (
                <div className="space-y-2">
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-gray-400 pl-1">
                    Post Visibility Duration
                  </label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { days: 1, label: '1 Day' },
                      { days: 3, label: '3 Days' },
                      { days: 7, label: '1 Week' },
                      { days: 14, label: '2 Weeks' },
                    ].map(({ days, label }) => {
                      const price = getPrice(formState.postType as 'seed' | 'canon', days);
                      const isSelected = formState.visibilityDays === days;

                      return (
                        <button
                          key={days}
                          type="button"
                          onClick={() => setFormState(prev => ({ ...prev, visibilityDays: days }))}
                          className={`p-2 rounded-lg text-center transition-all border ${isSelected
                            ? 'bg-[#EC1D99]/20 border-[#EC1D99] text-white'
                            : 'bg-gray-800/50 border-gray-700/50 text-gray-400 hover:border-gray-600'
                            }`}
                        >
                          <div className="text-xs font-bold">{label}</div>
                          <div className={`text-[9px] font-semibold ${isSelected ? 'text-green-400' : 'text-gray-500'}`}>
                            {price ? formatPrice(price) : 'N/A'}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[9px] text-gray-500 px-1">
                    How long this post stays visible on the discovery page.
                  </p>
                </div>
              )}

              {/* Product Link for Brand Posts */}
              {(formState.postType === 'seed' || formState.postType === 'canon') && (
                <div className="space-y-2">
                  <label htmlFor="product-url" className="block text-[10px] font-semibold uppercase tracking-wider text-gray-400 pl-1">
                    Product Link <span className="text-gray-500 font-normal normal-case ml-1">(Optional)</span>
                  </label>
                  <input
                    id="product-url"
                    type="url"
                    value={formState.productUrl || ''}
                    onChange={(e) => setFormState(prev => ({ ...prev, productUrl: e.target.value }))}
                    placeholder="https://yourbrand.com/product"
                    className="w-full px-3 py-2.5 bg-gray-800/50 border border-gray-700/50 rounded-lg focus:outline-none focus:border-[#EC1D99] focus:ring-2 focus:ring-[#EC1D99]/20 transition-all text-white text-sm placeholder-gray-500"
                  />
                  <p className="text-[9px] text-gray-500 px-1">
                    Your story title will become a clickable link to this URL
                  </p>
                </div>
              )}

              {/* Info about brand posts */}
              {formState.postType !== 'normal' && (
                <div className="p-2 bg-gray-800/50 rounded-lg border border-gray-700/50 text-[10px] text-gray-400">
                  <span className="text-[#EC1D99] font-semibold">Note:</span> Brand posts are public. Anyone can stitch to empty slots.
                </div>
              )}
            </div>
          ) : (
            /* Standard Visibility Selector for non-brand users */
            <div className="flex gap-3">
              {/* Option 1: Private */}
              <div
                onClick={() => handleVisibilityChange("private")}
                className={`flex-1 flex flex-col sm:flex-row items-center sm:items-start gap-3 p-4 rounded-2xl cursor-pointer transition-all border ${formState.visibility === "private" ? "bg-[#EC1D99]/10 border-[#EC1D99] shadow-[0_0_20px_rgba(236,29,153,0.1)]" : "bg-gray-800/50 border-gray-700/50 hover:border-gray-600 hover:bg-gray-800"}`}
              >
                <div className={`p-2.5 rounded-xl ${formState.visibility === "private" ? "bg-[#EC1D99] text-white shadow-lg shadow-[#EC1D99]/20" : "bg-gray-700 text-gray-400"}`}>
                  <Lock className="w-5 h-5" />
                </div>
                <div className="text-center sm:text-left">
                  <label
                    className={`text-sm font-bold cursor-pointer block font-sans ${formState.visibility === "private" ? "text-white" : "text-gray-300"}`}
                  >
                    Private
                  </label>
                  <p
                    className="text-xs text-gray-500 mt-0.5 font-sans leading-relaxed"
                  >
                    Only invited friends can view and contribute
                  </p>
                </div>
              </div>

              {/* Option 2: Public */}
              <div
                onClick={() => handleVisibilityChange("public")}
                className={`flex-1 flex flex-col sm:flex-row items-center sm:items-start gap-3 p-4 rounded-2xl cursor-pointer transition-all border ${formState.visibility === "public" ? "bg-[#EC1D99]/10 border-[#EC1D99] shadow-[0_0_20px_rgba(236,29,153,0.1)]" : "bg-gray-800/50 border-gray-700/50 hover:border-gray-600 hover:bg-gray-800"}`}
              >
                <div className={`p-2.5 rounded-xl ${formState.visibility === "public" ? "bg-[#EC1D99] text-white shadow-lg shadow-[#EC1D99]/20" : "bg-gray-700 text-gray-400"}`}>
                  <Globe className="w-5 h-5" />
                </div>
                <div className="text-center sm:text-left">
                  <label
                    className={`text-sm font-bold cursor-pointer block font-sans ${formState.visibility === "public" ? "text-white" : "text-gray-300"}`}
                  >
                    Public
                  </label>
                  <p
                    className="text-xs text-gray-500 mt-0.5 font-sans leading-relaxed"
                  >
                    Anyone can view, but only invited friends join
                  </p>
                </div>
              </div>
            </div>
          )}
        </fieldset>
      )
      }

      {/* Number of Participants - Different UI for brand posts */}
      {
        (formState.postType === 'seed' || formState.postType === 'canon') ? (
          /* Brand Post Slot Configuration */
          <div className="bg-gray-800/30 p-4 rounded-2xl border border-white/5 space-y-4">
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 font-sans pl-1">
              {formState.postType === 'seed' ? 'Contributor Slots' : 'Story Slots'}
            </label>

            {/* Slot Count Selector */}
            <div className="flex items-center justify-between gap-4">
              <button
                onClick={() => {
                  const minSlots = formState.postType === 'seed' ? 2 : 1; // Seed needs at least brand + 1
                  if (formState.inviteCount + 1 > minSlots) {
                    setFormState(prev => ({ ...prev, inviteCount: prev.inviteCount - 1 }));
                  }
                }}
                disabled={formState.inviteCount + 1 <= (formState.postType === 'seed' ? 2 : 1)}
                className="w-10 h-10 rounded-xl bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-white transition-colors"
              >
                <span className="text-xl font-bold mb-1">-</span>
              </button>

              <div className="flex-1 text-center">
                <div className="text-3xl font-bold text-white tracking-tight">
                  {formState.inviteCount + 1}
                </div>
                <div className="text-xs text-gray-500 font-medium uppercase tracking-wider mt-1">
                  Total Slots
                </div>
              </div>

              <button
                onClick={() => {
                  if (formState.inviteCount + 1 < 10) {
                    setFormState(prev => ({ ...prev, inviteCount: prev.inviteCount + 1 }));
                  }
                }}
                disabled={formState.inviteCount + 1 >= 10}
                className="w-10 h-10 rounded-xl bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-white transition-colors"
              >
                <span className="text-xl font-bold mb-1">+</span>
              </button>
            </div>

            {/* Slot Preview */}
            <div className="bg-gray-900/50 rounded-xl p-3 border border-gray-800">
              <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
                {Array.from({ length: formState.inviteCount + 1 }).map((_, idx) => {
                  const isBrandSlot = formState.postType === 'seed' && idx === 0;
                  const isCanonLocked = formState.postType === 'canon' && formState.canonSlots?.includes(idx);

                  return (
                    <div key={idx} className="flex items-center gap-2">
                      <div
                        onClick={() => {
                          if (formState.postType === 'canon') {
                            // Toggle lock for canon posts
                            setFormState(prev => ({
                              ...prev,
                              canonSlots: prev.canonSlots?.includes(idx)
                                ? prev.canonSlots.filter(i => i !== idx)
                                : [...(prev.canonSlots || []), idx]
                            }));
                          }
                        }}
                        className={`relative flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center transition-all ${isBrandSlot
                          ? 'bg-[#EC1D99] border-2 border-[#EC1D99]'
                          : isCanonLocked
                            ? 'bg-purple-500/20 border-2 border-purple-500 cursor-pointer'
                            : formState.postType === 'canon'
                              ? 'bg-gray-700 border-2 border-gray-600 cursor-pointer hover:border-purple-400'
                              : 'bg-gray-700 border-2 border-gray-600'
                          }`}
                      >
                        {isBrandSlot ? (
                          <img
                            src={currentUser?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser?.id}`}
                            alt="Brand"
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : isCanonLocked ? (
                          <span className="text-lg">🔒</span>
                        ) : (
                          <span className="text-gray-500 text-xs">{idx + 1}</span>
                        )}
                        {isBrandSlot && (
                          <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-0.5">
                            <span className="text-[8px]">🌱</span>
                          </div>
                        )}
                      </div>
                      {idx < formState.inviteCount && (
                        <div className="w-4 h-0.5 bg-gray-700 flex-shrink-0" />
                      )}
                    </div>
                  );
                })}
              </div>

              {formState.postType === 'seed' && (
                <p className="text-[10px] text-gray-500 mt-2 text-center">
                  🌱 You're locked in slot 1. Others will fill remaining slots.
                </p>
              )}
              {formState.postType === 'canon' && (
                <p className="text-[10px] text-gray-500 mt-2 text-center">
                  🔒 Tap slots to lock them. Locked slots can only be filled by you.
                </p>
              )}
            </div>

            <p className="text-xs text-gray-400 px-1">
              🌍 This post will be <span className="text-green-400 font-medium">public</span>. Anyone can stitch to open slots.
            </p>
          </div>
        ) : (
          /* Normal Post - Original Participant UI */
          <>
            <div className="bg-gray-800/30 p-4 rounded-2xl border border-white/5">
              <label
                htmlFor="invite-count"
                className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-4 font-sans pl-1"
              >
                Number of Participants
              </label>
              <div className="flex items-center justify-between gap-4">
                <button
                  onClick={() => {
                    const current = formState.inviteCount + 1;
                    if (current > 2) {
                      const newTotal = current - 1;
                      const newCount = newTotal - 1;

                      // Update slots
                      setSlots(prev => {
                        // When reducing, slice from the end
                        return prev.slice(0, newTotal);
                      });
                      setFormState(prev => ({ ...prev, inviteCount: newCount }));
                    }
                  }}
                  disabled={formState.inviteCount + 1 <= 2}
                  className="w-10 h-10 rounded-xl bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-white transition-colors"
                >
                  <span className="text-xl font-bold mb-1">-</span>
                </button>

                <div className="flex-1 text-center">
                  <div className="text-3xl font-bold text-white tracking-tight">
                    {formState.inviteCount + 1}
                  </div>
                  <div className="text-xs text-gray-500 font-medium uppercase tracking-wider mt-1">
                    People Total
                  </div>
                </div>

                <button
                  onClick={() => {
                    const current = formState.inviteCount + 1;
                    if (current < 11) {
                      const newTotal = current + 1;
                      const newCount = newTotal - 1;

                      setSlots(prev => {
                        const newItems = Array.from({ length: 1 }).map(() => ({ id: generateId(), friend: null }));
                        return [...prev, ...newItems];
                      });

                      setFormState(prev => ({ ...prev, inviteCount: newCount }));
                    }
                  }}
                  disabled={formState.inviteCount + 1 >= 11}
                  className="w-10 h-10 rounded-xl bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-white transition-colors"
                >
                  <span className="text-xl font-bold mb-1">+</span>
                </button>
              </div>
            </div>


            {/* Improved Slots Visualization */}
            <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-800">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-300">Story Turn Order</span>

                {/* Reorder Toggle */}
                <button
                  onClick={() => setIsReordering(!isReordering)}
                  className={`text-xs font-medium px-3 py-1 rounded-full transition-colors ${isReordering
                    ? "bg-[#EC1D99] text-white"
                    : "bg-gray-800 text-gray-400 hover:text-white"
                    }`}
                >
                  {isReordering ? "Done" : "Reorder"}
                </button>
              </div>

              {/* Reorder.Group for Drag and Drop */}
              <Reorder.Group
                axis="x"
                layoutScroll
                values={slots}
                onReorder={setSlots}
                className="flex items-start py-2 overflow-x-auto pb-4 no-scrollbar px-5"
              >
                {slots.map((slot, idx) => {
                  const participant = slot.friend;
                  const isCurrentUser = participant?.id === currentUser?.id;

                  return (
                    <StorySlotItem
                      key={slot.id}
                      slot={slot}
                      index={idx}
                      isCurrentUser={isCurrentUser}
                      isLocked={formState.visibility === 'public' && idx === 0} // Lock slot 1 for public stories
                      onRemove={handleRemoveFriend}
                      onFill={(i) => {
                        // For public stories, add current user to slot instead of opening friends picker
                        if (formState.visibility === 'public' && currentUser) {
                          const newSlots = [...slots];
                          const isCurrentUserInSlot = newSlots[i].friend?.id === currentUser.id;

                          if (isCurrentUserInSlot) {
                            // Prevent removing current user from slot 1 (index 0) - they must always be there
                            if (i === 0) {
                              return; // Don't allow removal from slot 1
                            }
                            // Remove current user from this slot
                            newSlots[i] = { ...newSlots[i], friend: null };
                          } else {
                            // Add current user to this slot
                            newSlots[i] = {
                              ...newSlots[i],
                              friend: { id: currentUser.id, name: currentUser.name, avatar: currentUser.avatar }
                            };
                          }
                          setSlots(newSlots);

                          // Update selectedSlotIndices based on slots with current user
                          const userSlotIndices = newSlots
                            .map((slot, idx) => slot.friend?.id === currentUser.id ? idx : -1)
                            .filter(idx => idx !== -1);
                          setSelectedSlotIndices(userSlotIndices);
                        } else {
                          // For private stories, open friends picker
                          setSlotToFill(i);
                          setShowFriendDropdown(true);
                        }
                      }}
                      isLast={idx === slots.length - 1}
                      isReordering={isReordering}
                    />
                  );
                })}
              </Reorder.Group>
            </div>
          </>
        )
      }

      {/* Friend Picker - Available for both public and private stories (brand users use slot system) */}
      {
        !currentUser?.isBrand && formState.postType !== 'seed' && formState.postType !== 'canon' && (
          <div className="relative mb-24">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-2">
                <label
                  htmlFor="friends-input"
                  className="block text-sm font-semibold text-white font-sans"
                >
                  Search Friends
                </label>
                {onRefreshFriends && (
                  <button
                    onClick={async () => {
                      setIsLoading(true);
                      await onRefreshFriends();
                      setIsLoading(false);
                      toast.success("Friends list refreshed");
                    }}
                    className="text-xs text-[#EC1D99] hover:text-[#D41C84] transition-colors font-medium"
                    type="button"
                  >
                    Refresh
                  </button>
                )}
              </div>
            </div>

            {/* Friend Search Input */}
            <div className="relative">
              <input
                id="friends-input"
                type="text"
                value={friendSearchInput}
                onChange={(e) => setFriendSearchInput(e.target.value)}
                ref={friendsInputRef}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (filteredFriends.length > 0) {
                      handleAddFriend(filteredFriends[0]);
                    }
                  }
                }}
                onFocus={() => setShowFriendDropdown(true)}
                onBlur={() => {
                  // Longer delay to prevent premature closing
                  setTimeout(() => setShowFriendDropdown(false), 500);
                }}
                placeholder="Type a name to search..."
                disabled={
                  !slots.some(s => s.friend === null)
                }
                className="w-full px-4 py-4 bg-gray-800/50 border border-gray-700/50 rounded-2xl focus:outline-none focus:border-[#EC1D99] focus:ring-4 focus:ring-[#EC1D99]/10 transition-all text-white placeholder-gray-500 disabled:opacity-50 disabled:cursor-not-allowed font-sans backdrop-blur-sm"
              />


              {/* Friend Avatar Popup */}
              {showFriendDropdown && (
                <div
                  role="dialog"
                  aria-label="Select a friend"
                  className="absolute top-full left-0 right-0 mt-3 bg-gray-900/95 backdrop-blur-md border-2 border-gray-700/50 rounded-2xl shadow-2xl z-50 max-h-96 overflow-y-auto p-4"
                >
                  {/* Dropdown Header */}
                  <div className="mb-3 pb-2 border-b border-gray-700/50">
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Select Friends to Add
                    </h3>
                  </div>

                  {isSearching ? (
                    <div className="flex items-center justify-center py-4 text-gray-400">
                      <Loader className="w-5 h-5 animate-spin mr-2" />
                      <span>Searching...</span>
                    </div>
                  ) : filteredFriends.length > 0 ? (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
                      {filteredFriends.map((friend) => {
                        const canAddToStory = friend.isFriend || friend.id === currentUser?.id;
                        const showFriendRequestButton = !friend.isFriend &&
                          friend.id !== currentUser?.id &&
                          friend.friendRequestStatus === 'none';
                        const isPendingSent = friend.friendRequestStatus === 'pending_sent';
                        const isPendingReceived = friend.friendRequestStatus === 'pending_received';

                        return (
                          <div
                            key={friend.id}
                            onClick={(e) => {
                              if (canAddToStory) {
                                e.preventDefault();
                                handleAddFriend(friend);
                              }
                            }}
                            className={`flex flex-col items-center gap-2 w-full p-2 rounded-lg relative group transition-all ${canAddToStory ? 'cursor-pointer hover:bg-gray-800 hover:scale-105' : ''}`}
                          >
                            <div className="relative">
                              <img
                                src={friend.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(friend.name)}`}
                                alt={friend.name}
                                className={`w-12 h-12 rounded-full border-2 ${canAddToStory ? 'border-gray-700' : 'border-gray-600 opacity-60'}`}
                              />
                              {!friend.isFriend && friend.id !== currentUser?.id && (
                                <div className="absolute -bottom-1 -right-1 bg-gray-700 rounded-full p-0.5">
                                  <UserPlus className="w-3 h-3 text-gray-400" />
                                </div>
                              )}
                              {isPendingSent && (
                                <div className="absolute -top-1 -right-1 bg-blue-500 rounded-full w-4 h-4 flex items-center justify-center">
                                  <span className="text-[8px]">...</span>
                                </div>
                              )}
                              {isPendingReceived && (
                                <div className="absolute -top-1 -right-1 bg-[#EC1D99] rounded-full w-4 h-4 flex items-center justify-center">
                                  <span className="text-[8px]">!</span>
                                </div>
                              )}
                            </div>
                            <span className="text-xs text-white text-center font-sans">
                              {friend.id === currentUser?.id ? "You" : friend.name.split(" ").slice(0, 2).join(" ")}
                            </span>
                            {friend.isInfluencer && (
                              <div className="flex items-center gap-1 bg-yellow-500/20 px-1.5 py-0.5 rounded text-[10px] text-yellow-400 border border-yellow-500/30">
                                <span>🪙</span>
                                <span>{friend.interactionCost}</span>
                              </div>
                            )}

                            {/* Action buttons */}
                            {canAddToStory ? (
                              null
                            ) : showFriendRequestButton ? (
                              <button
                                onMouseDown={async (e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  if (!currentUser) return;
                                  const success = await sendFriendRequest(currentUser.id, friend.id);
                                  if (success) {
                                    toast.success(`Friend request sent to ${friend.name}`);
                                    setFriendSearchInput(friendSearchInput + ' ');
                                    setTimeout(() => setFriendSearchInput(friendSearchInput), 10);
                                  } else {
                                    toast.error('Could not send friend request');
                                  }
                                }}
                                className="w-full py-1 px-2 bg-gray-700 hover:bg-gray-600 text-white text-[10px] rounded-md transition-colors"
                              >
                                Send Request
                              </button>
                            ) : isPendingSent ? (
                              <div className="w-full py-1 px-2 bg-blue-500/20 text-blue-400 text-[10px] rounded-md text-center border border-blue-500/30">
                                Pending
                              </div>
                            ) : isPendingReceived ? (
                              <div className="w-full py-1 px-2 bg-[#EC1D99]/20 text-[#EC1D99] text-[10px] rounded-md text-center border border-[#EC1D99]/30">
                                Check Activity
                              </div>
                            ) : (
                              <div className="w-full py-1 px-2 bg-gray-800 text-gray-500 text-[10px] rounded-md text-center">
                                Not Available
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-gray-500 text-sm">
                      No users found
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )
      }
    </div >
  );

  // Render Section 3: Finishing Touches (Advanced Settings only now)
  const renderFinishingTouchesSection = () => (
    <div className="space-y-6 mt-8">
      <div className="text-left mb-2">
        <h2 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
          <Hash className="w-5 h-5 text-[#EC1D99]" />
          Settings
        </h2>
        <p className="text-gray-400 text-sm">Configure advanced settings</p>
      </div>


      {/* Advanced Options */}
      <div>
        <button
          type="button"
          onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
          className="w-full flex items-center justify-between p-4 bg-gray-800/30 border border-white/5 rounded-2xl hover:bg-gray-800/50 transition-colors group"
        >
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-gray-300 font-sans group-hover:text-white transition-colors">Advanced Options</span>
            <span className="text-xs text-gray-500 font-medium bg-gray-800 px-2 py-0.5 rounded-full border border-gray-700">
              {[
                formState.turnTimerHours && '⏰ Timer',
                formState.scheduledFor && '📅 Scheduled',
              ].filter(Boolean).join(', ') || 'Optional'}
            </span>
          </div>
          <svg
            className={`w-5 h-5 text-gray-500 group-hover:text-white transition-all duration-300 ${showAdvancedOptions ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showAdvancedOptions && (
          <div className="mt-2 p-4 bg-gray-800/30 border border-white/5 rounded-2xl space-y-4 animate-fadeIn">
            {/* Turn Timer - Hidden for Seed/Canon posts which use visibility days */}
            {formState.postType !== 'seed' && formState.postType !== 'canon' && (
              <>
                <div>
                  <label htmlFor="turn-timer" className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2 font-sans pl-1">
                    Turn Timer
                  </label>
                  <div className="relative">
                    <select
                      id="turn-timer"
                      value={formState.turnTimerHours ?? ''}
                      onChange={(e) => {
                        const value = e.target.value === '' ? undefined : parseInt(e.target.value);
                        setFormState(prev => ({ ...prev, turnTimerHours: value }));
                      }}
                      className="w-full px-4 py-4 pl-4 bg-gray-900 border border-gray-700 rounded-2xl focus:outline-none focus:border-[#EC1D99] focus:ring-4 focus:ring-[#EC1D99]/10 transition-all text-white font-sans appearance-none"
                    >
                      <option value="">No limit</option>
                      <option value="6">6 hours</option>
                      <option value="12">12 hours</option>
                      <option value="24">24 hours</option>
                      <option value="48">48 hours</option>
                      <option value="72">72 hours</option>
                      <option value="168">1 week</option>
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2 px-1">
                    How long each participant has to add their part
                  </p>
                </div>

                {currentUser?.isInfluencer && (
                  <>
                    <div className="h-px bg-white/5" />

                    {/* Monetization Cost */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <label htmlFor="monetization-cost" className="block text-xs font-semibold uppercase tracking-wider text-gray-400 font-sans pl-1">
                          Entry Fee
                        </label>
                        <div className="text-right">
                          <div className="text-[#EC1D99] font-bold text-lg font-sans">
                            {formState.monetizationCost ? `${formState.monetizationCost} Tokens` : 'Free'}
                          </div>
                          {formState.monetizationCost ? (
                            <div className="text-xs text-gray-500 font-normal">
                              ≈ ${(formState.monetizationCost * 0.10).toFixed(2)} USD
                            </div>
                          ) : null}
                        </div>
                      </div>

                      <div className="relative group px-1">
                        <input
                          id="monetization-cost"
                          type="range"
                          min="0"
                          max="500" // 500 tokens = $50
                          step="5"
                          value={formState.monetizationCost ?? 0}
                          onChange={(e) => {
                            const val = parseInt(e.target.value);
                            setFormState(prev => ({ ...prev, monetizationCost: val === 0 ? undefined : val }));
                          }}
                          className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-[#EC1D99]"
                        />
                        <div className="flex justify-between text-xs text-gray-500 mt-2 font-sans font-medium">
                          <span>Free</span>
                          <span>500 Tokens</span>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mt-4 px-1">
                        Earn tokens when people join your story. Set a fee in tokens.
                      </p>
                    </div>
                  </>
                )}

                <div className="h-px bg-white/5" />
              </>
            )}

            {/* Allow Comments Toggle */}
            <div className="flex items-center justify-between py-1">
              <div>
                <div className="text-sm text-gray-300 font-bold font-sans">
                  Allow comments
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  Users can comment on this story
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formState.allowComments}
                  onChange={() => {
                    setFormState(prev => ({ ...prev, allowComments: !prev.allowComments }));
                  }}
                  className="sr-only peer"
                />
                <span
                  className={`w-12 h-7 rounded-full transition-colors duration-300 ${formState.allowComments ? "bg-[#EC1D99]" : "bg-gray-700"}`}
                >
                  <span
                    className={`block w-6 h-6 rounded-full bg-white shadow-lg transform transition-transform duration-300 ease-spring ${formState.allowComments ? "translate-x-5.5" : "translate-x-0.5"} translate-y-0.5`}
                  ></span>
                </span>
              </label>
            </div>

            {/* Schedule Post - Brand Only */}
            {currentUser?.isBrand && (
              <>
                <div className="h-px bg-white/5" />
                <div>
                  <label htmlFor="schedule-time" className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2 font-sans pl-1">
                    Schedule Post
                  </label>
                  <div className="relative">
                    <input
                      type="datetime-local"
                      id="schedule-time"
                      value={formState.scheduledFor || ''}
                      onChange={(e) => {
                        setFormState(prev => ({ ...prev, scheduledFor: e.target.value }));
                      }}
                      className="w-full px-4 py-4 pl-4 bg-gray-900 border border-gray-700 rounded-2xl focus:outline-none focus:border-[#EC1D99] focus:ring-4 focus:ring-[#EC1D99]/10 transition-all text-white font-sans appearance-none [&::-webkit-calendar-picker-indicator]:invert"
                    />
                    {!formState.scheduledFor && (
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-2 px-1">
                    Set a future date and time to publish this story
                  </p>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col min-h-screen bg-black text-white" ref={topRef}>
      {/* Header */}
      <header className="sticky top-0 z-20 bg-black/90 backdrop-blur-md border-b border-gray-800 px-4 py-4 pt-[calc(env(safe-area-inset-top,0px)+1rem)] flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={handleBack}
            className="p-2 rounded-full border border-[#EC1D99] text-[#EC1D99] bg-black hover:bg-gray-900 transition-colors"
            aria-label="Go back"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div>
            <h1
              className="text-xl font-bold text-white font-sans"
            >
              Create Story
            </h1>
            {groupId && groupName && (
              <div className="flex items-center gap-1.5 mt-1">
                {groupAvatar && (
                  <img
                    src={groupAvatar}
                    alt={groupName}
                    className="w-4 h-4 rounded-full"
                  />
                )}
                <span className="text-xs text-gray-400">for {groupName}</span>
              </div>
            )}
          </div>
        </div>
        {currentUser && (
          <NotificationBell userId={currentUser.id} className="bg-black/70 border border-white/10 backdrop-blur-md shadow-lg" />
        )}
      </header>

      <main className="flex-1 px-4 py-8 pb-32 overflow-y-auto overflow-x-hidden hidden-scrollbar">
        <div className="max-w-xl mx-auto space-y-8 overflow-visible">

          {/* Error Message */}
          {error && (
            <div
              role="alert"
              aria-live="assertive"
              className="p-4 bg-red-500/10 border border-red-500/50 rounded-2xl animate-fadeIn flex items-center gap-3"
            >
              <div className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
              <p className="text-sm text-red-200 font-medium font-sans">
                {error}
              </p>
            </div>
          )}

          {/* Section 1: Story Details */}
          <div className="bg-gray-900/40 border border-white/5 rounded-3xl p-6 backdrop-blur-sm shadow-xl">
            {renderDetailsSection()}
          </div>

          {/* Section 2: Participants */}
          <div className={`bg-gray-900/40 border border-white/5 rounded-3xl p-6 backdrop-blur-sm shadow-xl transition-all duration-300 ${showFriendDropdown ? 'pb-96' : 'pb-6'}`}>
            {renderContributorsSection()}
          </div>

          {/* Section 3: Extras */}
          <div className="bg-gray-900/40 border border-white/5 rounded-3xl p-6 backdrop-blur-sm shadow-xl">
            {renderFinishingTouchesSection()}
          </div>

        </div>
      </main>

      {/* Footer Actions */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black via-black/95 to-transparent z-10 pb-[env(safe-area-inset-bottom,20px)]">
        <div className="max-w-xl mx-auto flex gap-3">
          <button
            onClick={handleBack}
            className="flex-1 px-6 py-3 border border-gray-800 rounded-2xl text-gray-300 font-bold hover:bg-gray-900 hover:text-white transition-colors flex items-center justify-center bg-black/50 backdrop-blur-md"
            disabled={isLoading}
          >
            Cancel
          </button>

          <button
            onClick={handleCreateStory}
            disabled={isLoading}
            className={`flex-[2] px-8 py-3 rounded-2xl text-white font-bold text-lg flex items-center justify-center gap-2 transition-all shadow-lg shadow-[#EC1D99]/25 ${isLoading
              ? "opacity-70 cursor-wait bg-[#EC1D99]"
              : "bg-[#EC1D99] hover:bg-[#D41C84] active:scale-[0.98]"
              }`}
          >
            {isLoading ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Check className="w-6 h-6" />
                Create
              </>
            )}
          </button>
        </div>
      </div>

      {/* CSS for animations */}
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        .hidden-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hidden-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
};

export default CreateStory;
