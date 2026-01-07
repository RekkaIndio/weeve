import { useState, useRef, useEffect, RefObject } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { searchUsers, addFriend, sendFriendRequest } from "@/lib/friends";
import { searchHashtags } from "@/lib/hashtags";
import { getPaymentLink } from "@/lib/revolut-payment-links";
import { CreateStoryFormState, Friend, StorySlot } from "./types";

interface UseCreateStoryProps {
  onBack?: () => void;
  onCreateStory: (data: CreateStoryFormState) => Promise<string>;
  availableFriends?: Friend[];
  currentUser?: {
    id: string;
    name: string;
    avatar?: string;
    tokens: number;
    isInfluencer?: boolean;
    isBrand?: boolean;
    brandSubscriptionStatus?: 'none' | 'active' | 'expired';
    preferences?: Record<string, any>;
  };
  onDeductTokens?: (amount: number) => boolean;
  groupId?: string;
  onRefreshFriends?: () => Promise<void>;
}

export const useCreateStory = ({
  onBack,
  onCreateStory,
  availableFriends = [],
  currentUser,
  onDeductTokens,
  groupId,
  onRefreshFriends,
}: UseCreateStoryProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteId = searchParams?.get('invite');

  const generateId = () => Math.random().toString(36).substr(2, 9);

  const handleBack = onBack ?? (() => router.back());

  // Refs
  const hashtagInputRef = useRef<HTMLInputElement>(null) as RefObject<HTMLInputElement>;
  const friendsInputRef = useRef<HTMLInputElement>(null) as RefObject<HTMLInputElement>;
  const titleInputRef = useRef<HTMLInputElement>(null) as RefObject<HTMLInputElement>;
  const errorTimeoutRef = useRef<number | null>(null);
  const topRef = useRef<HTMLDivElement>(null) as RefObject<HTMLDivElement>;
  const participantsRef = useRef<HTMLDivElement>(null) as RefObject<HTMLDivElement>;
  const loadingStartTimeRef = useRef<number | null>(null);

  // State
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
    orderedParticipants: slots.map(s => s.friend),
    inviteCount: 1,
    hashtags: [],
    allowComments: true,
    turnTimerHours: undefined,
    monetizationCost: undefined,
    postType: 'normal',
    canonSlots: [],
  });

  // Sync slots to orderedParticipants
  useEffect(() => {
    setFormState(prev => ({
      ...prev,
      orderedParticipants: slots.map(s => s.friend)
    }));
  }, [slots]);

  const [hashtagInput, setHashtagInput] = useState("");
  const [hashtagSuggestions, setHashtagSuggestions] = useState<string[]>([]);
  const [showHashtagDropdown, setShowHashtagDropdown] = useState(false);
  const [isSearchingHashtags, setIsSearchingHashtags] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  
  const [friendSearchInput, setFriendSearchInput] = useState("");
  const [showFriendDropdown, setShowFriendDropdown] = useState(false);
  const [slotToFill, setSlotToFill] = useState<number | null>(null);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [isReordering, setIsReordering] = useState(false);

  // For public stories logic
  const [selectedSlotIndices, setSelectedSlotIndices] = useState<number[]>([0]);

  // Search logic for friends
  const [searchResults, setSearchResults] = useState<Friend[]>([]);
  const [isSearchingFriends, setIsSearchingFriends] = useState(false);

  // Safety mechanism for stuck loading
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isLoading) {
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

  // Handle invite query param
  useEffect(() => {
    if (inviteId && availableFriends.length > 0) {
      const friendToInvite = availableFriends.find(f => f.id === inviteId);
      if (friendToInvite) {
        setSlots(prevSlots => {
          const newSlots = [...prevSlots];
          const emptyIndex = newSlots.findIndex(s => s.friend === null);
          if (emptyIndex !== -1) {
            newSlots[emptyIndex] = { ...newSlots[emptyIndex], friend: friendToInvite };
          }
          return newSlots;
        });

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

  // Clear timers on unmount
  useEffect(() => {
    return () => {
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
      }
    };
  }, []);

  // Filter friends
  const allAvailableFriends = currentUser
    ? [{ id: currentUser.id, name: currentUser.name, avatar: currentUser.avatar }, ...availableFriends]
    : availableFriends;

  const localFilteredFriends = friendSearchInput.trim()
    ? allAvailableFriends.filter((friend) =>
      friend.name.toLowerCase().includes(friendSearchInput.toLowerCase())
    )
    : allAvailableFriends;

  // Debounced remote search for friends
  useEffect(() => {
    const search = async () => {
      if (!friendSearchInput.trim() || !currentUser) {
        setSearchResults([]);
        setIsSearchingFriends(false);
        return;
      }

      if (localFilteredFriends.length === 0) {
        setIsSearchingFriends(true);
      }

      try {
        const remoteMatches = await searchUsers(friendSearchInput, currentUser.id);
        const combined = [...localFilteredFriends];
        remoteMatches.forEach(remote => {
          if (!combined.some(local => local.id === remote.id)) {
            combined.push(remote);
          }
        });
        setSearchResults(combined);
        setIsSearchingFriends(false);
      } catch (err) {
        console.error("Search failed", err);
        setIsSearchingFriends(false);
      }
    };

    const timeoutId = setTimeout(search, 400);
    return () => clearTimeout(timeoutId);
  }, [friendSearchInput, currentUser]);

  const filteredFriends = friendSearchInput.trim()
    ? (searchResults.length > 0 ? searchResults : localFilteredFriends)
    : allAvailableFriends;


  // Handlers
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.slice(0, 60);
    setFormState((prev) => ({ ...prev, title: value }));
    setError("");
  };

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value.slice(0, 200);
    setFormState((prev) => ({ ...prev, description: value }));
  };

  const handleVisibilityChange = (visibility: "public" | "private") => {
    setFormState((prev) => ({ ...prev, visibility }));
    setError("");
  };

  const handlePostTypeChange = (postType: 'normal' | 'canon' | 'seed') => {
    setFormState((prev) => ({
      ...prev,
      postType,
      canonSlots: postType === 'seed' ? [0] : (postType === 'normal' ? [] : prev.canonSlots),
      visibility: postType !== 'normal' ? 'public' : prev.visibility,
    }));
    setError("");
  };

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

  const handleAddFriend = async (friend: Friend) => {
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

    if (friend.isFriend === false && currentUser) {
      try {
        await addFriend(currentUser.id, friend.id);
      } catch (err) {
        console.error("Failed to add friend", err);
      }
    }

    let inserted = false;
    const newSlots = [...slots];

    if (slotToFill !== null && slotToFill < newSlots.length) {
      newSlots[slotToFill] = { ...newSlots[slotToFill], friend };
      inserted = true;
    } else {
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

  const handleRemoveFriend = (friendId: string, slotIndex?: number) => {
    setSlots(currentSlots => {
      const newSlots = [...currentSlots];
      if (slotIndex !== undefined && slotIndex < newSlots.length) {
        newSlots[slotIndex] = { ...newSlots[slotIndex], friend: null };
      } else {
        const index = newSlots.findIndex(s => s.friend && s.friend.id === friendId);
        if (index !== -1) {
          newSlots[index] = { ...newSlots[index], friend: null };
        }
      }
      
      const newSelectedFriends = newSlots
        .map(s => s.friend)
        .filter((p): p is Friend => p !== null && p.id !== currentUser?.id);

      setFormState(prev => ({ ...prev, selectedFriends: newSelectedFriends }));
      return newSlots;
    });
  };

  const handleSlotCountChange = (increment: boolean) => {
    const current = formState.inviteCount + 1;
    if (increment) {
        if (current < 11) {
            const newTotal = current + 1;
            const newCount = newTotal - 1;
            setSlots(prev => [...prev, { id: generateId(), friend: null }]);
            setFormState(prev => ({ ...prev, inviteCount: newCount }));
        }
    } else {
        if (current > (formState.postType === 'seed' ? 2 : 2)) { // Normal min is 2 (creator+1)
            const newTotal = current - 1;
            const newCount = newTotal - 1;
            setSlots(prev => prev.slice(0, newTotal));
            setFormState(prev => ({ ...prev, inviteCount: newCount }));
        } else if (formState.postType !== 'seed' && current > 2) {
             // Redundant check but ok
        }
    }
  }

  // Hashtag Search
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

  const normalizeTag = (tag: string) => tag.trim().replace(/^#+/, "").replace(/\s+/g, "").toLowerCase();

  const handleAddHashtag = (rawTag?: string) => {
    const t = rawTag ?? hashtagInput;
    const val = normalizeTag(t);
    if (!val) return;
    if (val.length > 30) {
        setError("Hashtag cannot be longer than 30 characters.");
        return;
    }
    const existing = formState.hashtags ?? [];
    if (existing.includes(val)) {
        setError("Hashtag already added.");
        return;
    }
    if (existing.length >= 10) {
        setError("You can only add up to 10 hashtags.");
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

  const handleSelectHashtagSuggestion = (tag: string) => {
    handleAddHashtag(tag);
    setShowHashtagDropdown(false);
    setHashtagSuggestions([]);
  };

  const handleCreateStory = async () => {
    if (formState.title.trim().length === 0) {
      setError("Story title is required");
      if (titleInputRef.current) titleInputRef.current.focus();
      return;
    }

    const activeParticipants = slots.map(s => s.friend).filter(p => p !== null);
    const isBrandPost = formState.postType === 'canon' || formState.postType === 'seed';
    const isPublicStoryWithSlotSelection = (formState.visibility === 'public' || groupId) && !isBrandPost;
    const userInSlots = slots.some(s => s.friend?.id === currentUser?.id);

    if (!userInSlots && !isBrandPost) {
      setError("You must add yourself to at least one slot");
      if (participantsRef.current) participantsRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    if (isPublicStoryWithSlotSelection) {
      if (selectedSlotIndices.length === 0) {
        setError("Please select at least one slot to fill for your public story");
        if (participantsRef.current) participantsRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
    } else if (!isBrandPost) {
      if (activeParticipants.length !== slots.length) {
        setError("Please fill all empty slots before creating the story");
        if (participantsRef.current) participantsRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
    }

    const requiresPayment = isBrandPost && formState.visibilityDays;
    if (isBrandPost && !formState.visibilityDays) {
      setError("Please select a visibility duration for your brand post");
      if (participantsRef.current) participantsRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    setIsLoading(true);
    loadingStartTimeRef.current = Date.now();
    setError("");

    try {
      const submissionData: CreateStoryFormState = {
        ...formState,
        orderedParticipants: slots.map(s => s.friend),
        selectedSlotIndices: isPublicStoryWithSlotSelection ? selectedSlotIndices : undefined,
      };

      const storyId = await onCreateStory(submissionData);

      if (requiresPayment && formState.visibilityDays) {
        const paymentLink = await getPaymentLink(
          formState.postType as 'seed' | 'canon',
          formState.visibilityDays,
          storyId
        );

        if (paymentLink) {
          window.location.href = paymentLink;
        } else {
          // Payment not configured - redirect to story instead
          console.warn('[CreateStory] Payment link not available, redirecting to story');
          router.push(`/story/${storyId}`);
        }
      } else {
        // No payment required - redirect to story
        router.push(`/story/${storyId}`);
      }
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

  return {
    // State
    formState,
    setFormState,
    slots,
    setSlots,
    hashtagInput,
    setHashtagInput,
    hashtagSuggestions,
    showHashtagDropdown,
    setShowHashtagDropdown,
    isSearchingHashtags,
    isLoading,
    error,
    friendSearchInput,
    setFriendSearchInput,
    showFriendDropdown,
    setShowFriendDropdown,
    showAdvancedOptions,
    setShowAdvancedOptions,
    isReordering,
    setIsReordering,
    filteredFriends,
    isSearchingFriends,
    
    // Handlers
    handleTitleChange,
    handleDescriptionChange,
    handleVisibilityChange,
    handlePostTypeChange,
    handleToggleCanonSlot,
    handleAddFriend,
    handleRemoveFriend,
    handleSlotCountChange,
    handleAddHashtag,
    handleRemoveHashtag,
    handleSelectHashtagSuggestion,
    handleCreateStory,
    handleBack,
    handleFillSlot: setSlotToFill,
    
    // Logic wrappers
    onRequestFriend: async (friendId: string) => {
        if (!currentUser) return false;
        const success = await sendFriendRequest(currentUser.id, friendId);
        if (success) {
             setFriendSearchInput(prev => prev + ' '); // Trigger re-render to update UI
             setTimeout(() => setFriendSearchInput(prev => prev.trim()), 10);
             return true;
        }
        return false;
    },

    // Refs
    refs: {
        titleInputRef,
        friendsInputRef,
        hashtagInputRef,
        participantsRef,
        topRef
    }
  };
};
