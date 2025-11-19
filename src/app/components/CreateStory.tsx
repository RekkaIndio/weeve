"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Loader } from "lucide-react";

interface Friend {
  id: string;
  name: string;
}

interface CreateStoryFormState {
  title: string;
  description: string;
  mode: "invite" | "open";
  selectedFriends: Friend[];
  maxWeeves: string;
  inviteCount: number; // number of invite slots (1-10)
  hashtags?: string[];
}

interface CreateStoryProps {
  onBack?: () => void;
  onCreateStory: (data: CreateStoryFormState) => Promise<void>;
  availableFriends?: Friend[];
}

const CreateStory = ({
  onBack,
  onCreateStory,
  availableFriends = [
    { id: "1", name: "Alice Johnson" },
    { id: "2", name: "Bob Smith" },
    { id: "3", name: "Carol Williams" },
    { id: "4", name: "David Brown" },
    { id: "5", name: "Emma Davis" },
    { id: "6", name: "Frank Miller" },
    { id: "7", name: "Grace Lee" },
    { id: "8", name: "Henry Wilson" },
  ],
}: CreateStoryProps) => {
  const router = useRouter();
  const handleBack = onBack ?? (() => router.back());
  const [formState, setFormState] = useState<CreateStoryFormState>({
    title: "",
    description: "",
    mode: "invite",
    selectedFriends: [],
    maxWeeves: "",
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
      maxWeeves: "", // Reset max weeves when switching modes
    }));
    setError("");
  };

  // Cover image was removed — stories no longer require a cover image.

  // Handle adding a friend
  const handleAddFriend = (friend: Friend) => {
    // Prevent duplicates
    if (formState.selectedFriends.some((f) => f.id === friend.id)) {
      setError("Friend already added");
      if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
      errorTimeoutRef.current = window.setTimeout(() => setError(""), 2000);
      return;
    }

    // If slotToFill is set, place friend into that slot
    if (slotToFill !== null) {
      setFormState((prev) => {
        const arr = [...prev.selectedFriends];
        // Insert or replace at the specified slot without creating holes
        if (slotToFill <= arr.length) {
          if (arr.length < prev.inviteCount) {
            arr.splice(slotToFill, 0, friend);
          } else {
            arr[slotToFill] = friend;
          }
        } else {
          arr.push(friend);
        }
        return { ...prev, selectedFriends: arr.slice(0, prev.inviteCount) };
      });
    } else {
      // Normal append if we have free slots
      if (formState.selectedFriends.length < formState.inviteCount) {
        setFormState((prev) => ({
          ...prev,
          selectedFriends: [...prev.selectedFriends, friend],
        }));
      } else {
        setError(`You can only add up to ${formState.inviteCount} people.`);
        if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
        errorTimeoutRef.current = window.setTimeout(() => setError(""), 2000);
      }
    }

    setSlotToFill(null);
    setFriendSearchInput("");
    setShowFriendDropdown(false);
  };

  // Handle removing a friend
  const handleRemoveFriend = (friendId: string) => {
    setFormState((prev) => ({
      ...prev,
      selectedFriends: prev.selectedFriends.filter((f) => f.id !== friendId),
    }));
  };

  // Handle invite count (slider) change
  const handleInviteCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Math.max(1, Math.min(10, parseInt(e.target.value || "1")));
    setFormState((prev) => ({
      ...prev,
      inviteCount: value,
      // If we reduced inviteCount, also trim selected friends
      selectedFriends: prev.selectedFriends.slice(0, value),
    }));
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

    if (formState.mode === "invite" && formState.selectedFriends.length === 0) {
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

  return (
    <div className="flex flex-col h-screen bg-[#F9FAFB]">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-[#E5E7EB] px-4 py-4 flex items-center gap-3">
        <button
          onClick={handleBack}
          className="p-2 rounded-full border border-[#EC1D99] text-[#EC1D99] bg-white hover:bg-[#FDF2F8] transition-colors"
          aria-label="Go back"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div>
          <h1
            className="text-3xl font-bold text-[#9333EA]"
            style={{ fontFamily: "Poppins, sans-serif" }}
          >
            Create Story
          </h1>
          <p
            className="text-sm text-[#6B7280] mt-1"
            style={{ fontFamily: "Inter, sans-serif" }}
          >
            Build your collaborative tale and invite contributors
          </p>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-6 pb-28">
        <div className="max-w-md mx-auto md:max-w-2xl lg:max-w-3xl">
          {/* Error Message */}
          {error && (
            <div
              role="alert"
              aria-live="assertive"
              className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg"
            >
              <p
                className="text-sm text-red-700"
                style={{ fontFamily: "Inter, sans-serif" }}
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
            className="block text-sm font-medium text-[#374151] mb-2"
            style={{ fontFamily: "Poppins, sans-serif" }}
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
            className="w-full px-4 py-3 border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#EC1D99] focus:ring-1 focus:ring-[#EC1D99] transition-colors text-[#1F2937] text-lg font-semibold"
            style={{ fontFamily: "Inter, sans-serif" }}
            aria-describedby="title-counter"
          />
          <p
            className="text-xs text-[#9CA3AF] mt-2"
            id="title-counter"
            style={{ fontFamily: "Inter, sans-serif" }}
          >
            {formState.title.length}/60
          </p>
          <p
            className="text-sm text-[#9CA3AF] mt-4"
            style={{ fontFamily: "Inter, sans-serif" }}
          >
            Writing a long description can help get 3x more views on average.
          </p>
        </div>

        {/* Number of Contributors (Invite Mode) */}
        {formState.mode === "invite" && (
          <div className="mb-6">
            <label
              htmlFor="invite-count"
              className="block text-sm font-medium text-[#374151] mb-2"
              style={{ fontFamily: "Poppins, sans-serif" }}
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
                className="w-10 text-right text-sm text-[#1F2937] font-medium"
                style={{ fontFamily: "Poppins, sans-serif" }}
              >
                {formState.inviteCount}
              </div>
            </div>

            {/* Slots visualization */}
            <div className="mt-3 flex gap-2 items-center">
              {Array.from({ length: formState.inviteCount }).map((_, idx) => {
                const friend = formState.selectedFriends[idx];
                return (
                  <button
                    key={`slot-${idx}`}
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
                    className={`w-10 h-10 flex items-center justify-center rounded-full border ${friend ? "bg-[#FDF2F8] ring-2 ring-[#EC1D99]" : "border-[#E5E7EB] bg-white"} text-sm text-[#1F2937] ${slotToFill === idx ? "ring-2 ring-[#EC1D99]" : ""}`}
                    aria-label={`Slot ${idx + 1} ${friend ? `occupied by ${friend.name}` : "empty"}`}
                  >
                    {friend ? (
                      <span>
                        {friend.name
                          .split(" ")
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join("")
                          .toUpperCase()}
                      </span>
                    ) : (
                      <span className="text-[#9CA3AF]">+</span>
                    )}
                  </button>
                );
              })}
            </div>
            <p
              className="text-xs text-[#9CA3AF] mt-2"
              style={{ fontFamily: "Inter, sans-serif" }}
            >
              Tap a slot to add a friend; tap a filled slot to remove.
            </p>
          </div>
        )}

        {/* Story Mode Selection */}
        <fieldset className="mb-6" aria-labelledby="story-mode-legend">
          <legend
            id="story-mode-legend"
            className="block text-sm font-medium text-[#374151] mb-4"
            style={{ fontFamily: "Poppins, sans-serif" }}
          >
            Story Mode
          </legend>

          {/* Option 1: Invite Specific People */}
          <div className="mb-4 flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
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
                className="text-sm font-medium text-[#1F2937] cursor-pointer block"
                style={{ fontFamily: "Poppins, sans-serif" }}
              >
                Invite Specific People
              </label>
              <p
                className="text-xs text-[#9CA3AF] mt-1"
                style={{ fontFamily: "Inter, sans-serif" }}
              >
                Invite friends to take turns in order
              </p>
            </div>
          </div>

          {/* Option 2: Open to All */}
          <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
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
                className="text-sm font-medium text-[#1F2937] cursor-pointer block"
                style={{ fontFamily: "Poppins, sans-serif" }}
              >
                Open to All
              </label>
              <p
                className="text-xs text-[#9CA3AF] mt-1"
                style={{ fontFamily: "Inter, sans-serif" }}
              >
                Anyone can join and add a weeve
              </p>
            </div>
          </div>
        </fieldset>

        {/* Conditional Field - Invite Specific People */}
        {formState.mode === "invite" && (
          <div className="mb-6 relative">
            <label
              htmlFor="friends-input"
              className="block text-sm font-medium text-[#374151] mb-2"
              style={{ fontFamily: "Poppins, sans-serif" }}
            >
              Add Friends
            </label>

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
                placeholder="Search and add friends (3-10 recommended)"
                disabled={
                  formState.selectedFriends.length >= formState.inviteCount
                }
                className="w-full px-3 py-3 border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#EC1D99] focus:ring-1 focus:ring-[#EC1D99] transition-colors text-[#1F2937] disabled:bg-gray-100 disabled:cursor-not-allowed"
                style={{ fontFamily: "Inter, sans-serif" }}
              />

              {/* Friend Dropdown */}
              {showFriendDropdown && filteredFriends.length > 0 && (
                <div
                  role="listbox"
                  className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#E5E7EB] rounded-lg shadow-lg z-20 max-h-48 overflow-y-auto"
                >
                  {filteredFriends.map((friend) => (
                    <button
                      role="option"
                      aria-selected={false}
                      key={friend.id}
                      onClick={() => handleAddFriend(friend)}
                      className="w-full text-left px-3 py-2 hover:bg-[#FDF2F8] transition-colors text-sm text-[#1F2937]"
                      style={{ fontFamily: "Inter, sans-serif" }}
                    >
                      {friend.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Selected Friends Chips */}
            {formState.selectedFriends.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {formState.selectedFriends.map((friend) => (
                  <div
                    key={friend.id}
                    className="inline-flex items-center gap-2 px-3 py-1 bg-[#FDF2F8] text-[#1F2937] rounded-full text-sm shadow-sm border border-transparent"
                    style={{ fontFamily: "Inter, sans-serif" }}
                  >
                    <span>{friend.name}</span>
                    <button
                      onClick={() => handleRemoveFriend(friend.id)}
                      className="text-[#9CA3AF] hover:text-[#EC1D99] transition-colors font-bold ml-1"
                      aria-label={`Remove ${friend.name}`}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            <p
              className="text-xs text-[#9CA3AF] mt-2"
              style={{ fontFamily: "Inter, sans-serif" }}
            >
              {formState.selectedFriends.length}/{formState.inviteCount} friends
              selected
            </p>
          </div>
        )}

        {/* Story Description Input */}
        <div className="mb-6">
          <label
            htmlFor="description"
            className="block text-sm font-medium text-[#374151] mb-2"
            style={{ fontFamily: "Poppins, sans-serif" }}
          >
            What&apos;s this story about?
          </label>
          <textarea
            id="description"
            value={formState.description}
            onChange={handleDescriptionChange}
            placeholder="Add a description (optional)"
            rows={4}
            className="w-full px-3 py-3 border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#EC1D99] focus:ring-1 focus:ring-[#EC1D99] transition-colors text-[#1F2937] resize-none"
            style={{ fontFamily: "Inter, sans-serif" }}
            aria-describedby="desc-counter"
          />
          <p
            className="text-xs text-[#9CA3AF] mt-2"
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
            className="block text-sm font-medium text-[#374151] mb-2"
            style={{ fontFamily: "Poppins, sans-serif" }}
          >
            Hashtags (optional)
          </label>
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (hashtagInputRef.current) {
                    hashtagInputRef.current.focus();
                  }
                }}
                className="px-4 py-2 rounded-full bg-[#F8FAFC] border text-[#1F2937] text-sm hover:bg-[#F0F4F8]"
              >
                # Hashtags
              </button>
              <button
                onClick={() => {
                  if (formState.mode !== "invite") {
                    setFormState((prev) => ({
                      ...prev,
                      mode: "invite",
                      maxWeeves: "",
                      selectedFriends: [],
                    }));
                    setTimeout(() => {
                      if (friendsInputRef.current)
                        friendsInputRef.current.focus();
                    }, 10);
                  } else {
                    if (friendsInputRef.current)
                      friendsInputRef.current.focus();
                  }
                }}
                className="px-4 py-2 rounded-full bg-[#F8FAFC] border text-[#1F2937] text-sm hover:bg-[#F0F4F8]"
              >
                @ Mention
              </button>
            </div>
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
                className="w-full px-3 py-3 border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#EC1D99] focus:ring-1 focus:ring-[#EC1D99] transition-colors text-[#1F2937]"
                style={{ fontFamily: "Inter, sans-serif" }}
                ref={hashtagInputRef}
              />
              <button
                onClick={() => handleAddHashtag()}
                className="px-4 py-2 rounded-lg bg-[#EC1D99] text-white font-semibold hover:bg-[#D41C84] transition-colors"
              >
                Add
              </button>
            </div>
            <p
              className="text-xs text-[#9CA3AF] mt-2"
              style={{ fontFamily: "Inter, sans-serif" }}
            >
              Add up to 10 hashtags. Press Enter or comma to add.
            </p>

            {/* Hashtag Chips */}
            {formState.hashtags && formState.hashtags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {formState.hashtags.map((tag) => (
                  <div
                    key={tag}
                    className="inline-flex items-center gap-2 px-3 py-1 bg-[#F8FAFC] text-[#1F2937] rounded-full text-sm shadow-sm border border-transparent"
                  >
                    <span>#{tag}</span>
                    <button
                      onClick={() => handleRemoveHashtag(tag)}
                      className="text-[#9CA3AF] hover:text-[#EC1D99] transition-colors font-bold ml-1"
                      aria-label={`Remove ${tag}`}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Location / Options (visual only) */}
          <div className="mb-6 border-t border-[#E5E7EB] pt-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div
                  className="text-sm text-[#374151] font-medium"
                  style={{ fontFamily: "Poppins, sans-serif" }}
                >
                  Location
                </div>
                <div className="text-xs text-[#9CA3AF]">
                  Select a location (optional)
                </div>
              </div>
              <div className="flex gap-2">
                <button className="px-3 py-1 rounded-full bg-[#F8FAFC] border text-sm text-[#1F2937]">
                  Great Britain
                </button>
                <button className="px-3 py-1 rounded-full bg-[#F8FAFC] border text-sm text-[#1F2937]">
                  City of Birmingham
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div>
                  <div
                    className="text-sm text-[#374151] font-medium"
                    style={{ fontFamily: "Poppins, sans-serif" }}
                  >
                    Allow comments
                  </div>
                  <div className="text-xs text-[#9CA3AF]">
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
                    className={`w-11 h-6 rounded-full ${allowComments ? "bg-[#EC1D99]" : "bg-gray-200"}`}
                  ></span>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div
                    className="text-sm text-[#374151] font-medium"
                    style={{ fontFamily: "Poppins, sans-serif" }}
                  >
                    Allow reuse of content
                  </div>
                  <div className="text-xs text-[#9CA3AF]">
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
                    className={`w-11 h-6 rounded-full ${allowReuse ? "bg-[#EC1D99]" : "bg-gray-200"}`}
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
                className="block text-sm font-medium text-[#374151] mb-2"
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
                className="w-full px-3 py-3 border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#EC1D99] focus:ring-1 focus:ring-[#EC1D99] transition-colors text-[#1F2937]"
                style={{ fontFamily: "Inter, sans-serif" }}
              />
              <p
                className="text-xs text-[#9CA3AF] mt-2"
                style={{ fontFamily: "Inter, sans-serif" }}
              >
                Limit how many people can contribute
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Button Section - Sticky at Bottom */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E5E7EB] px-4 py-4">
        <div className="max-w-md mx-auto md:max-w-2xl lg:max-w-3xl flex gap-3">
          <button
            onClick={handleBack}
            className="flex-1 px-6 py-3 border border-[#374151] rounded-lg text-[#374151] font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ fontFamily: "Poppins, sans-serif" }}
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            onClick={handleCreateStory}
            disabled={isCreateDisabled}
            className={`flex-1 px-8 py-4 rounded-lg text-white font-bold flex items-center justify-center gap-2 transition-all shadow-lg ${
              isCreateDisabled
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
