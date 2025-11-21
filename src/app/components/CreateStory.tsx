"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Loader } from "lucide-react";
import StoryTemplates, { Template } from "./StoryTemplates";
import ThemeSelector from "./ThemeSelector";

export interface Friend {
  id: string;
  name: string;
  avatar?: string;
  isInfluencer?: boolean;
  interactionCost?: number;
}

export interface CreateStoryFormState {
  title: string;
  description: string;
  mode: "invite" | "open";
  selectedFriends: Friend[];
  orderedParticipants?: (Friend | null)[];
  maxWeeves: string;
  inviteCount: number; // number of invite slots (1-10)
  hashtags?: string[];
  theme?: string;
}

interface CreateStoryProps {
  onBack?: () => void;
  onCreateStory: (data: CreateStoryFormState) => Promise<void>;
  availableFriends?: Friend[];
  currentUser?: { id: string; name: string; avatar?: string; tokens: number };
  onDeductTokens?: (amount: number) => boolean;
}

const CreateStory = ({
  onBack,
  onCreateStory,
  availableFriends = [],
  currentUser,
  onDeductTokens,
}: CreateStoryProps) => {
  const router = useRouter();
  const handleBack = onBack ?? (() => router.back());
  const [formState, setFormState] = useState<CreateStoryFormState>({
    title: "",
    description: "",
    mode: "invite",
    selectedFriends: [],
    orderedParticipants: currentUser
      ? [{ id: currentUser.id, name: currentUser.name, avatar: currentUser.avatar }, ...Array(3).fill(null)]
      : Array(4).fill(null),
    maxWeeves: "",
    inviteCount: 3,
    hashtags: [],
    theme: 'default',
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
    if (formState.mode === "invite" && formState.selectedFriends.length === 0)
      return true;
    if (formState.mode === "open" && formState.maxWeeves !== "") {
      const n = parseInt((formState.maxWeeves as unknown as string) || "0");
      if (Number.isNaN(n) || n < 5 || n > 100) return true;
    }
    return false;
  })();

  // Filter available friends based on search input and already selected
  const filteredFriends = availableFriends.filter((friend) => {
    const isSelected = formState.selectedFriends.some(
      (f) => f.id === friend.id,
    );
    const matchesSearch = friend.name
      .toLowerCase()
      .includes(friendSearchInput.toLowerCase());
    return !isSelected && matchesSearch;
  });

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

  // Handle mode selection change
  const handleModeChange = (mode: "invite" | "open") => {
    setFormState((prev) => ({
      ...prev,
      mode,
      selectedFriends: [], // Reset friends when switching modes
      orderedParticipants: mode === 'invite'
        ? [currentUser ? { id: currentUser.id, name: currentUser.name, avatar: currentUser.avatar } : null, ...Array(prev.inviteCount).fill(null)]
        : [],
      maxWeeves: "", // Reset max weeves when switching modes
    }));
    setError("");
  };

  // Handle adding a friend
  const handleAddFriend = (friend: Friend) => {
    // Prevent duplicates
    if (formState.selectedFriends.some((f) => f.id === friend.id)) {
      setError("Friend already added");
      if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
      errorTimeoutRef.current = window.setTimeout(() => setError(""), 2000);
      return;
    }

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
  const handleRemoveFriend = (friendId: string) => {
    if (friendId === currentUser?.id) {
      setError("You cannot remove yourself from the story.");
      if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
      errorTimeoutRef.current = window.setTimeout(() => setError(""), 2000);
      return;
    }
    setFormState((prev) => ({
      ...prev,
      selectedFriends: prev.selectedFriends.filter((f) => f.id !== friendId),
      orderedParticipants: (prev.orderedParticipants || []).map(f => (f && f.id === friendId) ? null : f)
    }));
  };

  // Handle invite count (slider) change
  const handleInviteCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Math.max(1, Math.min(10, parseInt(e.target.value || "1")));
    setFormState((prev) => {
      const currentArr = prev.orderedParticipants || [];
      const newArr = [...currentArr];
      const targetLength = value + 1; // +1 for creator

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

  // Handle max weeves input change
  const handleMaxWeevesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === "" || /^\d+$/.test(value)) {
      const numValue =
        value === ""
          ? ""
          : Math.min(Math.max(parseInt(value), 5), 100).toString();
      setFormState((prev) => ({
        ...prev,
        maxWeeves: value === "" ? "" : numValue,
      }));
    }
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

    if (formState.mode === "invite" && activeParticipants.length < 2) {
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

  const handleTemplateSelect = (template: Template) => {
    setFormState((prev) => ({
      ...prev,
      title: template.title,
      description: template.description,
      mode: template.mode,
      inviteCount: template.inviteCount || prev.inviteCount,
      maxWeeves: template.maxWeeves || "",
      hashtags: template.hashtags,
      orderedParticipants: template.mode === 'invite'
        ? [currentUser ? { id: currentUser.id, name: currentUser.name, avatar: currentUser.avatar } : null, ...Array(template.inviteCount || 3).fill(null)]
        : [],
      selectedFriends: [], // Reset friends as template changes mode/structure
    }));
  };

  const handleThemeSelect = (themeId: string) => {
    setFormState((prev) => ({
      ...prev,
      theme: themeId,
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
      <header className="sticky top-0 z-20 bg-black/90 backdrop-blur-md border-b border-gray-800 px-4 py-4 flex items-center gap-3">
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
        </div>
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

        {/* Templates */}
        <StoryTemplates onSelect={handleTemplateSelect} />

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

        {/* Story Mode Selection */}
        <fieldset className="mb-6" aria-labelledby="story-mode-legend">
          <legend
            id="story-mode-legend"
            className="block text-sm font-medium text-gray-300 mb-4 font-sans"
          >
            Story Mode
          </legend>

          <div className="flex gap-4">
            {/* Option 1: Closed */}
            <div className="flex-1 flex items-start gap-3 p-3 rounded-lg hover:bg-gray-900 cursor-pointer transition-colors border border-transparent hover:border-gray-800">
              <input
                type="radio"
                id="mode-invite"
                name="mode"
                value="invite"
                checked={formState.mode === "invite"}
                onChange={() => handleModeChange("invite")}
                className="mt-1 w-5 h-5 accent-[#EC1D99] cursor-pointer"
              />
              <div className="flex-1">
                <label
                  htmlFor="mode-invite"
                  className="text-sm font-medium text-white cursor-pointer block font-sans"
                >
                  Closed
                </label>
                <p
                  className="text-xs text-gray-500 mt-1 font-sans"
                >
                  Invite friends to take turns in order
                </p>
              </div>
            </div>

            {/* Option 2: Open */}
            <div className="flex-1 flex items-start gap-3 p-3 rounded-lg hover:bg-gray-900 cursor-pointer transition-colors border border-transparent hover:border-gray-800">
              <input
                type="radio"
                id="mode-open"
                name="mode"
                value="open"
                checked={formState.mode === "open"}
                onChange={() => handleModeChange("open")}
                className="mt-1 w-5 h-5 accent-[#EC1D99] cursor-pointer"
              />
              <div className="flex-1">
                <label
                  htmlFor="mode-open"
                  className="text-sm font-medium text-white cursor-pointer block font-sans"
                >
                  Open
                </label>
                <p
                  className="text-xs text-gray-500 mt-1 font-sans"
                >
                  Anyone can join and add a weeve
                </p>
              </div>
            </div>
          </div>
        </fieldset>

        {/* Number of Contributors (Invite Mode) */}
        {formState.mode === "invite" && (
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
                min={1}
                max={10}
                value={formState.inviteCount}
                onChange={handleInviteCountChange}
                className="w-full accent-[#EC1D99]"
                aria-label="Number of contributors"
                aria-valuemin={1}
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
            <div className="mt-3 flex gap-2 items-center flex-wrap">
              {Array.from({ length: (formState.inviteCount || 3) + 1 }).map((_, idx) => {
                const friend = formState.orderedParticipants?.[idx];
                const isCurrentUser = friend?.id === currentUser?.id;

                return (
                  <button
                    key={`slot-${idx}`}
                    type="button"
                    draggable={!!friend}
                    onDragStart={(e) => friend && handleDragStart(e, idx)}
                    onDragEnd={() => setDraggedIndex(null)}
                    onDragOver={(e) => handleDragOver(e, idx)}
                    onDrop={(e) => handleDrop(e, idx)}
                    onClick={() => {
                      if (friend) {
                        handleRemoveFriend(friend.id);
                      } else {
                        setSlotToFill(idx);
                        if (friendsInputRef.current) {
                          friendsInputRef.current.focus();
                          setShowFriendDropdown(true);
                        }
                      }
                    }}
                    className={`w-10 h-10 flex items-center justify-center rounded-full border ${friend ? "bg-[#EC1D99]/20 ring-2 ring-[#EC1D99] border-transparent overflow-hidden cursor-move" : "border-gray-700 bg-gray-900"} text-sm text-white ${slotToFill === idx ? "ring-2 ring-[#EC1D99]" : ""} ${draggedIndex === idx ? "opacity-50" : ""}`}
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
                );
              })}
            </div>
          </div>
        )}

        {/* Conditional Field - Invite Specific People */}
        {formState.mode === "invite" && (
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
                  (formState.orderedParticipants?.length || 0) >= formState.inviteCount + 1
                }
                className="w-full px-3 py-3 bg-gray-900 border border-gray-800 rounded-lg focus:outline-none focus:border-[#EC1D99] focus:ring-1 focus:ring-[#EC1D99] transition-colors text-white placeholder-gray-600 disabled:opacity-50 disabled:cursor-not-allowed font-sans"
              />

              {/* Friend Avatar Popup */}
              {showFriendDropdown && filteredFriends.length > 0 && (
                <div
                  role="dialog"
                  aria-label="Select a friend"
                  className="absolute top-full left-0 right-0 mt-2 bg-gray-900 border border-gray-800 rounded-lg shadow-lg z-20 max-h-64 overflow-y-auto p-3"
                >
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                    {filteredFriends.map((friend) => (
                      <button
                        key={friend.id}
                        onClick={() => handleAddFriend(friend)}
                        className="flex flex-col items-center gap-2 w-full hover:bg-gray-800 transition-colors p-2 rounded-md"
                      >
                        <img
                          src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(friend.name)}`}
                          alt={friend.name}
                          className="w-12 h-12 rounded-full border border-gray-700"
                        />
                        <span className="text-xs text-white text-center font-sans">
                          {friend.name.split(" ").slice(0, 2).join(" ")}
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
                </div>
              )}
            </div>

            {/* Selected Friends Chips */}
            {formState.selectedFriends.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {formState.selectedFriends.map((friend) => (
                  <div
                    key={friend.id}
                    className="inline-flex items-center gap-2 px-3 py-1 bg-[#EC1D99]/20 text-white rounded-full text-sm border border-[#EC1D99]/30 font-sans"
                  >
                    <img
                      src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(friend.name)}`}
                      alt={friend.name}
                      className="w-6 h-6 rounded-full border border-gray-700"
                    />
                    <span>{friend.name.split(" ").slice(0, 2).join(" ")}</span>
                    <button
                      onClick={() => handleRemoveFriend(friend.id)}
                      className="text-gray-400 hover:text-white transition-colors font-bold ml-1"
                      aria-label={`Remove ${friend.name}`}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

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

        {/* Theme Selector */}
        <ThemeSelector
          selectedTheme={formState.theme || 'default'}
          onSelect={handleThemeSelect}
        />

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

        {/* Conditional Field - Open to All */}
        {formState.mode === "open" && (
          <div className="mb-6">
            <label
              htmlFor="max-weeves"
              className="block text-sm font-medium text-gray-300 mb-2"
              style={{ fontFamily: "Poppins, sans-serif" }}
            >
              Max Weeves (optional)
            </label>
            <input
              id="max-weeves"
              type="number"
              value={formState.maxWeeves}
              onChange={handleMaxWeevesChange}
              placeholder="Leave blank for unlimited"
              min="5"
              max="100"
              className="w-full px-3 py-3 bg-gray-900 border border-gray-800 rounded-lg focus:outline-none focus:border-[#EC1D99] focus:ring-1 focus:ring-[#EC1D99] transition-colors text-white placeholder-gray-600"
              style={{ fontFamily: "Inter, sans-serif" }}
            />
          </div>
        )}
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
