"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, Loader, Globe, Lock, UserPlus } from "lucide-react";
import NotificationBell from "./NotificationBell";
import { searchUsers, addFriend, Friend as FriendType } from "@/lib/friends";
import { toast } from "sonner";

export interface Friend {
  id: string;
  name: string;
  avatar?: string;
  isInfluencer?: boolean;
  interactionCost?: number;
  isFriend?: boolean;
}

export interface CreateStoryFormState {
  title: string;
  description: string;
  visibility: "public" | "private";
  selectedFriends: Friend[];
  orderedParticipants?: (Friend | null)[];

  inviteCount: number; // number of invite slots (1-10)
  hashtags?: string[];
}

interface CreateStoryProps {
  onBack?: () => void;
  onCreateStory: (data: CreateStoryFormState) => Promise<void>;
  availableFriends?: Friend[];
  currentUser?: { id: string; name: string; avatar?: string; tokens: number };
  onDeductTokens?: (amount: number) => boolean;
  groupId?: string;
  groupName?: string;
  groupAvatar?: string;
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
}: CreateStoryProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteId = searchParams?.get('invite');

  const handleBack = onBack ?? (() => router.back());
  const [formState, setFormState] = useState<CreateStoryFormState>({
    title: "",
    description: "",
    visibility: "private",
    selectedFriends: [],
    orderedParticipants: currentUser
      ? [{ id: currentUser.id, name: currentUser.name, avatar: currentUser.avatar }, ...Array(3).fill(null)]
      : Array(4).fill(null),

    inviteCount: 3,
    hashtags: [],
  });

  const [hashtagInput, setHashtagInput] = useState("");
  const hashtagInputRef = useRef<HTMLInputElement | null>(null);
  const friendsInputRef = useRef<HTMLInputElement | null>(null);
  const titleInputRef = useRef<HTMLInputElement | null>(null);
  const errorTimeoutRef = useRef<number | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [friendSearchInput, setFriendSearchInput] = useState("");
  const [showFriendDropdown, setShowFriendDropdown] = useState(false);
  const [slotToFill, setSlotToFill] = useState<number | null>(null);
  const [allowComments, setAllowComments] = useState(true);
  const [allowReuse, setAllowReuse] = useState(true);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Handle invite query param
  useEffect(() => {
    if (inviteId && availableFriends.length > 0) {
      const friendToInvite = availableFriends.find(f => f.id === inviteId);
      if (friendToInvite) {
        // Add to first available slot
        setFormState(prev => {
          const newParticipants = [...(prev.orderedParticipants || [])];
          const emptyIndex = newParticipants.findIndex(p => p === null);
          if (emptyIndex !== -1) {
            newParticipants[emptyIndex] = friendToInvite;
            return {
              ...prev,
              selectedFriends: [...prev.selectedFriends, friendToInvite],
              orderedParticipants: newParticipants
            };
          }
          return prev;
        });
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

  // Validation check for Create button
  const isCreateDisabled = (() => {
    if (isLoading) return true;
    if (formState.title.trim().length === 0) return true;
    // Always require at least one friend for now since it's turn-based
    if (formState.selectedFriends.length === 0) return true;
    return false;
  })();

  const [searchResults, setSearchResults] = useState<Friend[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Filter available friends based on search input (including current user)
  const allAvailableFriends = currentUser
    ? [{ id: currentUser.id, name: currentUser.name, avatar: currentUser.avatar }, ...availableFriends]
    : availableFriends;

  // Debounced search
  useEffect(() => {
    const search = async () => {
      if (!friendSearchInput.trim() || !currentUser) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      try {
        // Local filter first
        const localMatches = allAvailableFriends.filter((friend) =>
          friend.name.toLowerCase().includes(friendSearchInput.toLowerCase())
        );

        // Remote search
        const remoteMatches = await searchUsers(friendSearchInput, currentUser.id);

        // Merge and deduplicate
        const combined = [...localMatches];
        remoteMatches.forEach(remote => {
          if (!combined.some(local => local.id === remote.id)) {
            combined.push(remote);
          }
        });

        setSearchResults(combined);
      } catch (err) {
        console.error("Search failed", err);
      } finally {
        setIsSearching(false);
      }
    };

    const timeoutId = setTimeout(search, 300);
    return () => clearTimeout(timeoutId);
  }, [friendSearchInput, currentUser, allAvailableFriends]);

  const filteredFriends = friendSearchInput ? searchResults : allAvailableFriends;

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
        // Update local state to reflect friendship? 
        // Ideally we should refetch friends but for now we just proceed
      } catch (err) {
        console.error("Failed to add friend", err);
        toast.error("Failed to add friend connection");
      }
    }

    setFormState((prev) => {
      const newParticipants = [...(prev.orderedParticipants || [])];
      let inserted = false;

      // If slotToFill is set, place friend into that slot
      if (slotToFill !== null && slotToFill < newParticipants.length) {
        newParticipants[slotToFill] = friend;
        inserted = true;
      } else {
        // Find first empty slot
        const emptyIndex = newParticipants.findIndex(p => p === null);
        if (emptyIndex !== -1) {
          newParticipants[emptyIndex] = friend;
          inserted = true;
        }
      }

      if (!inserted) {
        setError(`You can only add up to ${prev.inviteCount} people.`);
        if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
        errorTimeoutRef.current = window.setTimeout(() => setError(""), 2000);
        return prev;
      }

      return {
        ...prev,
        selectedFriends: [...prev.selectedFriends, friend],
        orderedParticipants: newParticipants
      };
    });

    setSlotToFill(null);
    setFriendSearchInput("");
    setShowFriendDropdown(false);
  };

  // Handle removing a friend
  const handleRemoveFriend = (friendId: string, slotIndex?: number) => {
    setFormState((prev) => {
      const newParticipants = [...(prev.orderedParticipants || [])];

      // If slotIndex is provided, remove from that specific slot
      // Otherwise, remove the first occurrence
      if (slotIndex !== undefined) {
        newParticipants[slotIndex] = null;
      } else {
        const index = newParticipants.findIndex(p => p && p.id === friendId);
        if (index !== -1) {
          newParticipants[index] = null;
        }
      }

      // Rebuild selectedFriends from orderedParticipants
      const newSelectedFriends = newParticipants.filter((p): p is Friend => p !== null && p.id !== currentUser?.id);

      return {
        ...prev,
        selectedFriends: newSelectedFriends,
        orderedParticipants: newParticipants
      };
    });
  };

  // Handle invite count (slider) change
  const handleInviteCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Math.max(2, Math.min(10, parseInt(e.target.value || "2")));
    setFormState((prev) => {
      const currentArr = prev.orderedParticipants || [];
      const newArr = [...currentArr];
      const targetLength = value; // Total users including creator

      if (newArr.length < targetLength) {
        // Grow
        while (newArr.length < targetLength) newArr.push(null);
      } else {
        // Shrink
        newArr.length = targetLength;
      }

      // Sync selectedFriends
      const newSelectedFriends = newArr.filter((p): p is Friend => p !== null && p.id !== currentUser?.id);

      return {
        ...prev,
        inviteCount: value,
        orderedParticipants: newArr,
        selectedFriends: newSelectedFriends
      };
    });
  };



  // Handle form submission
  const handleCreateStory = async () => {
    // Validation
    if (formState.title.trim().length === 0) {
      setError("Story title is required");
      if (titleInputRef.current) titleInputRef.current.focus();
      return;
    }

    const activeParticipants = (formState.orderedParticipants || []).filter(p => p !== null);

    if (activeParticipants.length < 2) {
      setError("Please add at least one friend to invite");
      if (friendsInputRef.current) friendsInputRef.current.focus();
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      await onCreateStory(formState);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to create story. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const normalizeTag = (tag: string) => {
    return tag.trim().replace(/^#+/, "").toLowerCase();
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



  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", index.toString());
    // Create a custom drag image if needed, or use default
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    const sourceIndexStr = e.dataTransfer.getData("text/plain");
    let sourceIndex = parseInt(sourceIndexStr);

    if (isNaN(sourceIndex)) {
      // Fallback to state if dataTransfer failed
      if (draggedIndex !== null) {
        sourceIndex = draggedIndex;
      } else {
        return;
      }
    }

    if (sourceIndex === dropIndex) return;

    setFormState((prev) => {
      const newParticipants = [...(prev.orderedParticipants || [])];
      // Ensure indices are valid
      if (sourceIndex >= newParticipants.length || dropIndex >= newParticipants.length) return prev;

      // Swap logic
      const temp = newParticipants[sourceIndex];
      newParticipants[sourceIndex] = newParticipants[dropIndex];
      newParticipants[dropIndex] = temp;

      return {
        ...prev,
        orderedParticipants: newParticipants
      };
    });
    setDraggedIndex(null);
  };

  return (
    <div className="flex flex-col min-h-full bg-black text-white">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-black/90 backdrop-blur-md border-b border-gray-800 px-4 py-4 flex items-center justify-between gap-3">
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
              className="text-2xl font-bold text-white font-sans"
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
          <NotificationBell className="bg-black/70 border border-white/10 backdrop-blur-md shadow-lg" />
        )}
      </header>

      <main className="flex-1 px-4 py-6">
        <div className="max-w-md mx-auto md:max-w-2xl lg:max-w-3xl">
          {/* Error Message */}
          {error && (
            <div
              role="alert"
              aria-live="assertive"
              className="mb-6 p-3 bg-red-900/50 border border-red-800 rounded-lg"
            >
              <p
                className="text-sm text-red-200 font-sans"
              >
                {error}
              </p>
            </div>
          )}
        </div>



        {/* Story Title Input */}
        <div className="mb-6">
          <label
            htmlFor="title"
            className="block text-sm font-medium text-gray-300 mb-2 font-sans"
          >
            Story Title
          </label>
          <input
            id="title"
            type="text"
            value={formState.title}
            ref={titleInputRef}
            onChange={handleTitleChange}
            placeholder="Give your story a name..."
            className="w-full px-4 py-3 bg-gray-900 border border-gray-800 rounded-lg focus:outline-none focus:border-[#EC1D99] focus:ring-1 focus:ring-[#EC1D99] transition-colors text-white text-lg font-semibold placeholder-gray-600 font-sans"
            aria-describedby="title-counter"
          />
          <p
            className="text-xs text-gray-500 mt-2 font-sans"
            id="title-counter"
          >
            {formState.title.length}/60
          </p>
        </div>

        {/* Story Visibility Selection - Hidden if groupId is present */}
        {!groupId && (
          <fieldset className="mb-6" aria-labelledby="story-visibility-legend">
            <legend
              id="story-visibility-legend"
              className="block text-sm font-medium text-gray-300 mb-4 font-sans"
            >
              Visibility
            </legend>

            <div className="flex gap-4">
              {/* Option 1: Private */}
              <div
                onClick={() => handleVisibilityChange("private")}
                className={`flex-1 flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all border ${formState.visibility === "private" ? "bg-[#EC1D99]/10 border-[#EC1D99]" : "bg-gray-900 border-transparent hover:border-gray-800"}`}
              >
                <div className={`mt-1 p-1 rounded-full ${formState.visibility === "private" ? "bg-[#EC1D99] text-white" : "bg-gray-800 text-gray-400"}`}>
                  <Lock className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <label
                    className="text-sm font-medium text-white cursor-pointer block font-sans"
                  >
                    Private
                  </label>
                  <p
                    className="text-xs text-gray-500 mt-1 font-sans"
                  >
                    Only invited friends can see and contribute
                  </p>
                </div>
              </div>

              {/* Option 2: Public */}
              <div
                onClick={() => handleVisibilityChange("public")}
                className={`flex-1 flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all border ${formState.visibility === "public" ? "bg-[#EC1D99]/10 border-[#EC1D99]" : "bg-gray-900 border-transparent hover:border-gray-800"}`}
              >
                <div className={`mt-1 p-1 rounded-full ${formState.visibility === "public" ? "bg-[#EC1D99] text-white" : "bg-gray-800 text-gray-400"}`}>
                  <Globe className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <label
                    className="text-sm font-medium text-white cursor-pointer block font-sans"
                  >
                    Public
                  </label>
                  <p
                    className="text-xs text-gray-500 mt-1 font-sans"
                  >
                    Anyone can see, but only invited friends can contribute
                  </p>
                </div>
              </div>
            </div>
          </fieldset>
        )}

        {/* Number of Contributors */}
        <div className="mb-6">
          <label
            htmlFor="invite-count"
            className="block text-sm font-medium text-gray-300 mb-2 font-sans"
          >
            Number of Contributors
          </label>
          <div className="flex items-center gap-3">
            <input
              id="invite-count"
              type="range"
              min={2}
              max={10}
              value={formState.inviteCount}
              onChange={(e) => {
                const newCount = parseInt(e.target.value);
                setFormState(prev => {
                  const currentParticipants = prev.orderedParticipants || [];
                  // We need newCount + 1 slots (1 for user + newCount for friends)
                  const targetLength = newCount + 1;

                  let newParticipants;
                  if (currentParticipants.length < targetLength) {
                    // Add empty slots
                    newParticipants = [...currentParticipants, ...Array(targetLength - currentParticipants.length).fill(null)];
                  } else {
                    // Remove slots from the end, but try to keep non-nulls if possible? 
                    // For now just slice, which might remove friends. 
                    // Ideally we should warn or prevent reducing if it removes friends.
                    newParticipants = currentParticipants.slice(0, targetLength);
                  }

                  return {
                    ...prev,
                    inviteCount: newCount,
                    orderedParticipants: newParticipants
                  };
                });
              }}
              className="w-full accent-[#EC1D99]"
              aria-label="Number of contributors"
              aria-valuemin={2}
              aria-valuemax={10}
              aria-valuenow={formState.inviteCount}
              aria-describedby="invite-count-value"
            />
            <div
              className="w-10 text-right text-sm text-white font-medium font-sans"
            >
              {formState.inviteCount}
            </div>
          </div>

          {/* Slots visualization */}
          <div className="mt-3 flex items-center flex-wrap max-w-[400px] gap-y-4">
            {Array.from({ length: formState.inviteCount }).map((_, idx) => {
              const friend = formState.orderedParticipants?.[idx];
              const isLast = idx === formState.inviteCount - 1;
              // Only show line if it's not the last item AND (we are not at max capacity OR it's not the absolute last item)
              // Actually, we want lines between all items.
              // If we add a power mode circle, we need a line to it as well if it's the last regular item.
              const showLine = !isLast || (formState.inviteCount === 10 && idx === 9);

              return (
                <div key={`slot-container-${idx}`} className="flex items-center">
                  <button
                    type="button"
                    draggable={!!friend}
                    onDragStart={(e) => friend && handleDragStart(e, idx)}
                    onDragEnd={() => setDraggedIndex(null)}
                    onDragOver={(e) => handleDragOver(e, idx)}
                    onDrop={(e) => handleDrop(e, idx)}
                    onClick={() => {
                      if (friend) {
                        handleRemoveFriend(friend.id, idx);
                      } else {
                        setSlotToFill(idx);
                        if (friendsInputRef.current) {
                          friendsInputRef.current.focus();
                          setShowFriendDropdown(true);
                        }
                      }
                    }}
                    className={`w-16 h-16 flex items-center justify-center rounded-full border relative z-10 ${friend ? "bg-[#EC1D99]/20 ring-2 ring-[#EC1D99] border-transparent overflow-hidden cursor-move" : "border-gray-700 bg-gray-900"} text-lg text-white ${slotToFill === idx ? "ring-2 ring-[#EC1D99]" : ""} ${draggedIndex === idx ? "opacity-50" : ""}`}
                    aria-label={`Slot ${idx + 1} ${friend ? `occupied by ${friend.name}` : "empty"}`}
                  >
                    {friend ? (
                      <img
                        src={friend.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(friend.name)}`}
                        alt={friend.name}
                        className="w-full h-full object-cover rounded-full pointer-events-none"
                      />
                    ) : (
                      <span className="text-gray-500">+</span>
                    )}
                  </button>
                  {showLine && (
                    <div className="w-4 h-0.5 bg-gray-700 mx-1"></div>
                  )}
                </div>
              );
            })}

            {/* Power Mode Circle */}
            {formState.inviteCount === 10 && (
              <div className="flex items-center">
                <button
                  type="button"
                  onClick={() => {
                    router.push('/wallet');
                  }}
                  className="w-16 h-16 flex items-center justify-center rounded-full border-2 border-yellow-500 bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20 transition-colors relative z-10"
                  aria-label="Unlock Power Mode for 20 contributors"
                >
                  <span className="font-bold text-sm">20+</span>
                </button>
              </div>
            )}
          </div>
        </div>


        {/* Invite Specific People */}
        <div className="mb-6 relative">
          <div className="flex justify-between items-center mb-2">
            <label
              htmlFor="friends-input"
              className="block text-sm font-medium text-gray-300 font-sans"
            >
              Add Friends
            </label>
            {currentUser && (
              <div className="text-sm text-yellow-400 flex items-center gap-1 font-medium bg-yellow-500/10 px-2 py-1 rounded-full border border-yellow-500/20">
                <span>🪙</span>
                <span>{currentUser.tokens}</span>
              </div>
            )}
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
              onBlur={() =>
                setTimeout(() => setShowFriendDropdown(false), 200)
              }
              placeholder="Search and add friends"
              disabled={
                !formState.orderedParticipants?.some(p => p === null)
              }
              className="w-full px-3 py-3 bg-gray-900 border border-gray-800 rounded-lg focus:outline-none focus:border-[#EC1D99] focus:ring-1 focus:ring-[#EC1D99] transition-colors text-white placeholder-gray-600 disabled:opacity-50 disabled:cursor-not-allowed font-sans"
            />

            {/* Friend Avatar Popup */}
            {showFriendDropdown && (
              <div
                role="dialog"
                aria-label="Select a friend"
                className="absolute top-full left-0 right-0 mt-2 bg-gray-900 border border-gray-800 rounded-lg shadow-lg z-20 max-h-64 overflow-y-auto p-3"
              >
                {isSearching ? (
                  <div className="flex items-center justify-center py-4 text-gray-400">
                    <Loader className="w-5 h-5 animate-spin mr-2" />
                    <span>Searching...</span>
                  </div>
                ) : filteredFriends.length > 0 ? (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                    {filteredFriends.map((friend) => (
                      <button
                        key={friend.id}
                        onClick={() => handleAddFriend(friend)}
                        className="flex flex-col items-center gap-2 w-full hover:bg-gray-800 transition-colors p-2 rounded-md relative group"
                      >
                        <div className="relative">
                          <img
                            src={friend.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(friend.name)}`}
                            alt={friend.name}
                            className="w-12 h-12 rounded-full border border-gray-700"
                          />
                          {friend.isFriend === false && (
                            <div className="absolute -bottom-1 -right-1 bg-[#EC1D99] rounded-full p-0.5">
                              <UserPlus className="w-3 h-3 text-white" />
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
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-500 text-sm">
                    No users found
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Selected Friends Chips - Show based on orderedParticipants */}
          {formState.orderedParticipants && formState.orderedParticipants.filter(p => p !== null).length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {formState.orderedParticipants.map((friend, slotIndex) => {
                if (!friend) return null;
                return (
                  <div
                    key={`friend-chip-slot-${slotIndex}`}
                    className="inline-flex items-center gap-2 px-3 py-1 bg-[#EC1D99]/20 text-white rounded-full text-sm border border-[#EC1D99]/30 font-sans"
                  >
                    <img
                      src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(friend.name)}`}
                      alt={friend.name}
                      className="w-6 h-6 rounded-full border border-gray-700"
                    />
                    <span>{friend.name.split(" ").slice(0, 2).join(" ")}</span>
                    <button
                      onClick={() => {
                        // Remove from this specific slot
                        setFormState((prev) => {
                          const newParticipants = [...(prev.orderedParticipants || [])];
                          newParticipants[slotIndex] = null;

                          // Rebuild selectedFriends from orderedParticipants
                          const newSelectedFriends = newParticipants.filter((p): p is Friend => p !== null && p.id !== currentUser?.id);

                          return {
                            ...prev,
                            selectedFriends: newSelectedFriends,
                            orderedParticipants: newParticipants
                          };
                        });
                      }}
                      className="text-gray-400 hover:text-white transition-colors font-bold ml-1"
                      aria-label={`Remove ${friend.name} from slot ${slotIndex + 1}`}
                    >
                      ×
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>


        {/* Story Description Input */}
        <div className="mb-6">
          <label
            htmlFor="description"
            className="block text-sm font-medium text-gray-300 mb-2 font-sans"
          >
            What&apos;s this story about?
          </label>
          <textarea
            id="description"
            value={formState.description}
            onChange={handleDescriptionChange}
            placeholder="Add a description (optional)"
            rows={4}
            className="w-full px-3 py-3 bg-gray-900 border border-gray-800 rounded-lg focus:outline-none focus:border-[#EC1D99] focus:ring-1 focus:ring-[#EC1D99] transition-colors text-white resize-none placeholder-gray-600 font-sans"
            aria-describedby="desc-counter"
          />
          <p
            className="text-xs text-gray-500 mt-2"
            id="desc-counter"
            style={{ fontFamily: "Inter, sans-serif" }}
          >
            {formState.description.length}/200
          </p>
        </div>

        {/* Hashtags Input */}
        <div className="mb-6">
          <label
            htmlFor="hashtag"
            className="block text-sm font-medium text-gray-300 mb-2 font-sans"
          >
            Hashtags (optional)
          </label>
          <div className="flex flex-col gap-2">
            <div className="flex gap-2 items-center">
              <input
                id="hashtag"
                type="text"
                value={hashtagInput}
                onChange={(e) => setHashtagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault();
                    handleAddHashtag();
                  }
                }}
                placeholder="#tag1 #tag2"
                className="w-full px-3 py-3 bg-gray-900 border border-gray-800 rounded-lg focus:outline-none focus:border-[#EC1D99] focus:ring-1 focus:ring-[#EC1D99] transition-colors text-white placeholder-gray-600 font-sans"
                ref={hashtagInputRef}
              />
              <button
                onClick={() => handleAddHashtag()}
                className="px-4 py-3 rounded-lg bg-[#EC1D99] text-white font-semibold hover:bg-[#D41C84] transition-colors"
              >
                Add
              </button>
            </div>

            {/* Hashtag Chips */}
            {formState.hashtags && formState.hashtags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {formState.hashtags.map((tag) => (
                  <div
                    key={tag}
                    className="inline-flex items-center gap-2 px-3 py-1 bg-gray-800 text-gray-200 rounded-full text-sm border border-gray-700"
                  >
                    <span>#{tag}</span>
                    <button
                      onClick={() => handleRemoveHashtag(tag)}
                      className="text-gray-500 hover:text-white transition-colors font-bold ml-1"
                      aria-label={`Remove ${tag}`}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>



        {/* Location / Options (visual only) */}
        <div className="mb-6 border-t border-gray-800 pt-4">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <div
                  className="text-sm text-gray-300 font-medium font-sans"
                >
                  Allow comments
                </div>
                <div className="text-xs text-gray-500">
                  Users can comment on this story
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={allowComments}
                  onChange={() => setAllowComments((a) => !a)}
                  className="sr-only peer"
                />
                <span
                  className={`w-11 h-6 rounded-full ${allowComments ? "bg-[#EC1D99]" : "bg-gray-700"}`}
                ></span>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div
                  className="text-sm text-gray-300 font-medium font-sans"
                >
                  Allow reuse of content
                </div>
                <div className="text-xs text-gray-500">
                  Duet, Stitch, stickers and add to Story
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={allowReuse}
                  onChange={() => setAllowReuse((a) => !a)}
                  className="sr-only peer"
                />
                <span
                  className={`w-11 h-6 rounded-full ${allowReuse ? "bg-[#EC1D99]" : "bg-gray-700"}`}
                ></span>
              </label>
            </div>
          </div>
        </div>


      </main>

      {/* Button Section - Sticky at Bottom */}
      <div className="sticky bottom-0 left-0 right-0 bg-black border-t border-gray-800 px-4 py-4 z-20">
        <div className="max-w-md mx-auto md:max-w-2xl lg:max-w-3xl flex gap-3">
          <button
            onClick={handleBack}
            className="flex-1 px-6 py-3 border border-gray-700 rounded-lg text-gray-300 font-medium hover:bg-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ fontFamily: "Poppins, sans-serif" }}
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            onClick={handleCreateStory}
            disabled={isCreateDisabled}
            className={`flex-1 px-8 py-4 rounded-lg text-white font-bold flex items-center justify-center gap-2 transition-all shadow-lg ${isCreateDisabled
              ? "opacity-50 cursor-not-allowed bg-[#EC1D99]"
              : "bg-gradient-to-r from-[#EC1D99] to-[#D41C84] hover:scale-[1.02]"
              }`}
            style={{ fontFamily: "Poppins, sans-serif" }}
          >
            {isLoading ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Story"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateStory;
