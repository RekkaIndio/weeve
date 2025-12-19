"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Loader, Globe, Lock, UserPlus, Check, GripVertical } from "lucide-react";
import NotificationBell from "./NotificationBell";
import { searchUsers, addFriend, Friend as FriendType, sendFriendRequest } from "@/lib/friends";
import { toast } from "sonner";

export interface Friend {
  id: string;
  name: string;
  avatar?: string;
  isInfluencer?: boolean;
  interactionCost?: number;
  isFriend?: boolean;
  friendRequestStatus?: 'none' | 'pending_sent' | 'pending_received' | 'accepted';
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
  onRefreshFriends?: () => Promise<void>;
}

// Step indicator component
const StepIndicator = ({
  currentStep,
  totalSteps,
  onStepClick
}: {
  currentStep: number;
  totalSteps: number;
  onStepClick?: (step: number) => void;
}) => {
  const steps = [
    { num: 1, label: "Details" },
    { num: 2, label: "Contributors" },
    { num: 3, label: "Finish" },
  ];

  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {steps.map((step, idx) => {
        // Can click on completed steps or current step
        const canClick = step.num < currentStep && onStepClick;

        return (
          <div key={step.num} className="flex items-center">
            <button
              type="button"
              onClick={() => canClick && onStepClick(step.num)}
              disabled={!canClick}
              className={`flex flex-col items-center ${canClick ? 'cursor-pointer' : 'cursor-default'}`}
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${currentStep === step.num
                  ? "bg-[#EC1D99] text-white scale-110"
                  : currentStep > step.num
                    ? "bg-green-500 text-white hover:bg-green-400"
                    : "bg-gray-800 text-gray-500"
                  }`}
              >
                {currentStep > step.num ? <Check className="w-5 h-5" /> : step.num}
              </div>
              <span
                className={`text-xs mt-1 transition-colors ${currentStep === step.num ? "text-white" : "text-gray-500"
                  }`}
              >
                {step.label}
              </span>
            </button>
            {idx < steps.length - 1 && (
              <div
                className={`w-12 h-0.5 mx-2 mb-5 transition-colors ${currentStep > step.num ? "bg-green-500" : "bg-gray-800"
                  }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};

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

  // Multi-step wizard state
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 3;

  const [formState, setFormState] = useState<CreateStoryFormState>({
    title: "",
    description: "",
    visibility: "private",
    selectedFriends: [],
    orderedParticipants: currentUser
      ? [{ id: currentUser.id, name: currentUser.name, avatar: currentUser.avatar }, ...Array(1).fill(null)]
      : Array(2).fill(null),

    inviteCount: 1,
    hashtags: [],
    allowComments: true,
    turnTimerHours: undefined,
    monetizationCost: undefined,
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
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);

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

  // Step validation
  const canProceedToStep2 = formState.title.trim().length > 0;
  // Allow proceeding if at least the current user is in the participants (user can create solo story)
  const hasAnyParticipant = (formState.orderedParticipants || []).some(p => p !== null);
  const canProceedToStep3 = hasAnyParticipant;
  const canCreateStory = canProceedToStep2 && canProceedToStep3 && !isLoading;

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
    console.log('[CreateStory] availableFriends prop:', availableFriends?.length, availableFriends);
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

      // Rebuild selectedFriends from orderedParticipants
      const newSelectedFriends = newParticipants.filter((p): p is Friend => p !== null && p.id !== currentUser?.id);

      return {
        ...prev,
        selectedFriends: newSelectedFriends,
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

  // Handle form submission
  const handleCreateStory = async () => {
    // Validation
    if (formState.title.trim().length === 0) {
      setError("Story title is required");
      setCurrentStep(1);
      if (titleInputRef.current) titleInputRef.current.focus();
      return;
    }

    const activeParticipants = (formState.orderedParticipants || []).filter(p => p !== null);

    if (activeParticipants.length < 1) {
      setError("No participants found");
      setCurrentStep(2);
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

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", index.toString());
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

  // Navigate between steps
  const goToNextStep = () => {
    if (currentStep === 1 && !canProceedToStep2) {
      setError("Please enter a story title");
      return;
    }
    if (currentStep === 2 && !canProceedToStep3) {
      setError("Please ensure you have at least one participant");
      return;
    }
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
      setError("");
    }
  };

  const goToPrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setError("");
    } else {
      handleBack();
    }
  };

  // Render Step 1: Story Details
  const renderStep1 = () => (
    <div className="space-y-6 animate-fadeIn">
      <div className="text-center mb-8">
        <h2 className="text-xl font-bold text-white mb-2">What's your story about?</h2>
        <p className="text-gray-400 text-sm">Give your collaborative story a title and optional description</p>
      </div>

      {/* Story Title Input */}
      <div>
        <label
          htmlFor="title"
          className="block text-sm font-medium text-gray-300 mb-2 font-sans"
        >
          Story Title <span className="text-[#EC1D99]">*</span>
        </label>
        <input
          id="title"
          type="text"
          value={formState.title}
          ref={titleInputRef}
          onChange={handleTitleChange}
          placeholder="Give your story a name..."
          className="w-full px-4 py-4 bg-gray-900 border border-gray-800 rounded-xl focus:outline-none focus:border-[#EC1D99] focus:ring-2 focus:ring-[#EC1D99]/20 transition-all text-white text-lg font-semibold placeholder-gray-600 font-sans"
          aria-describedby="title-counter"
          autoFocus
        />
        <p
          className="text-xs text-gray-500 mt-2 font-sans text-right"
          id="title-counter"
        >
          {formState.title.length}/60
        </p>
      </div>

      {/* Story Description Input */}
      <div>
        <label
          htmlFor="description"
          className="block text-sm font-medium text-gray-300 mb-2 font-sans"
        >
          Description <span className="text-gray-500">(optional)</span>
        </label>
        <textarea
          id="description"
          value={formState.description}
          onChange={handleDescriptionChange}
          placeholder="What's this story about? Set the scene for your collaborators..."
          rows={4}
          className="w-full px-4 py-4 bg-gray-900 border border-gray-800 rounded-xl focus:outline-none focus:border-[#EC1D99] focus:ring-2 focus:ring-[#EC1D99]/20 transition-all text-white resize-none placeholder-gray-600 font-sans"
          aria-describedby="desc-counter"
        />
        <p
          className="text-xs text-gray-500 mt-2 text-right"
          id="desc-counter"
        >
          {formState.description.length}/200
        </p>
      </div>
    </div>
  );

  // Render Step 2: Visibility & Contributors
  const renderStep2 = () => (
    <div className="space-y-6 animate-fadeIn">
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-white mb-2">Who can contribute?</h2>
        <p className="text-gray-400 text-sm">Set visibility and invite friends to collaborate</p>
      </div>

      {/* Story Visibility Selection - Hidden if groupId is present */}
      {!groupId && (
        <fieldset aria-labelledby="story-visibility-legend">
          <legend
            id="story-visibility-legend"
            className="block text-sm font-medium text-gray-300 mb-3 font-sans"
          >
            Visibility
          </legend>

          <div className="flex gap-3">
            {/* Option 1: Private */}
            <div
              onClick={() => handleVisibilityChange("private")}
              className={`flex-1 flex items-center gap-3 p-4 rounded-xl cursor-pointer transition-all border-2 ${formState.visibility === "private" ? "bg-[#EC1D99]/10 border-[#EC1D99]" : "bg-gray-900 border-gray-800 hover:border-gray-700"}`}
            >
              <div className={`p-2 rounded-full ${formState.visibility === "private" ? "bg-[#EC1D99] text-white" : "bg-gray-800 text-gray-400"}`}>
                <Lock className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <label
                  className="text-sm font-semibold text-white cursor-pointer block font-sans"
                >
                  Private
                </label>
                <p
                  className="text-xs text-gray-500 mt-0.5 font-sans"
                >
                  Only invited friends
                </p>
              </div>
            </div>

            {/* Option 2: Public */}
            <div
              onClick={() => handleVisibilityChange("public")}
              className={`flex-1 flex items-center gap-3 p-4 rounded-xl cursor-pointer transition-all border-2 ${formState.visibility === "public" ? "bg-[#EC1D99]/10 border-[#EC1D99]" : "bg-gray-900 border-gray-800 hover:border-gray-700"}`}
            >
              <div className={`p-2 rounded-full ${formState.visibility === "public" ? "bg-[#EC1D99] text-white" : "bg-gray-800 text-gray-400"}`}>
                <Globe className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <label
                  className="text-sm font-semibold text-white cursor-pointer block font-sans"
                >
                  Public
                </label>
                <p
                  className="text-xs text-gray-500 mt-0.5 font-sans"
                >
                  Anyone can view
                </p>
              </div>
            </div>
          </div>
        </fieldset>
      )}

      {/* Number of Contributors */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label
            htmlFor="invite-count"
            className="block text-sm font-medium text-gray-300 font-sans"
          >
            Number of Contributors
          </label>
          <span className="text-lg font-bold text-[#EC1D99]">{formState.inviteCount}</span>
        </div>
        <input
          id="invite-count"
          type="range"
          min={1}
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
                // Remove slots from the end
                newParticipants = currentParticipants.slice(0, targetLength);
              }

              return {
                ...prev,
                inviteCount: newCount,
                orderedParticipants: newParticipants
              };
            });
          }}
          className="w-full accent-[#EC1D99] h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer"
          aria-label="Number of contributors"
        />
        <p className="text-xs text-gray-500 mt-2">How many people will contribute to this story (excluding you)</p>
      </div>

      {/* Improved Slots Visualization */}
      <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-800">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-gray-300">Story Turn Order</span>
          <span className="text-xs text-gray-500 flex items-center gap-1">
            <GripVertical className="w-3 h-3" />
            Drag to reorder
          </span>
        </div>

        <div className="flex items-center flex-wrap gap-4 py-2">
          {Array.from({ length: formState.inviteCount + 1 }).map((_, idx) => {
            const participant = formState.orderedParticipants?.[idx];
            const isCurrentUser = participant?.id === currentUser?.id;
            const isEmpty = !participant;
            const isFirstEmpty = isEmpty && formState.orderedParticipants?.findIndex(p => p === null) === idx;

            return (
              <div key={`slot-${idx}`} className="flex items-center">
                <div
                  draggable={!!participant && !isCurrentUser}
                  onDragStart={(e) => {
                    if (participant && !isCurrentUser) {
                      handleDragStart(e, idx);
                    }
                  }}
                  onDragEnd={() => setDraggedIndex(null)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDrop={(e) => handleDrop(e, idx)}
                  onClick={() => {
                    if (participant && !isCurrentUser) {
                      handleRemoveFriend(participant.id, idx);
                    } else if (isEmpty) {
                      setSlotToFill(idx);
                      setShowFriendDropdown(true);
                    }
                  }}
                  className={`flex flex-col items-center transition-all duration-200 ${draggedIndex === idx ? "opacity-50 scale-95" : ""
                    } ${participant && !isCurrentUser ? "cursor-grab active:cursor-grabbing" : isEmpty ? "cursor-pointer" : ""}`}
                >
                  {/* Avatar/Slot Circle */}
                  <div
                    className={`w-14 h-14 rounded-full flex items-center justify-center transition-all select-none ${participant
                      ? "ring-2 ring-[#EC1D99] ring-offset-2 ring-offset-black"
                      : slotToFill === idx
                        ? "ring-2 ring-[#EC1D99] ring-offset-2 ring-offset-black bg-gray-800 border-2 border-dashed border-[#EC1D99]"
                        : "bg-gray-800 border-2 border-dashed border-gray-600 hover:border-gray-500"
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
                      <div className="text-gray-500 text-2xl pointer-events-none">+</div>
                    )}
                  </div>

                  {/* Label with turn number */}
                  <div className="flex flex-col items-center mt-1 pointer-events-none">
                    <span className={`text-[10px] font-medium ${participant ? "text-[#EC1D99]" : "text-gray-600"}`}>
                      #{idx + 1}
                    </span>
                    <span className={`text-xs text-center max-w-[56px] truncate ${participant ? "text-white" : "text-gray-500"
                      }`}>
                      {participant
                        ? (isCurrentUser ? "You" : participant.name.split(" ")[0])
                        : (isFirstEmpty ? "Add" : "Empty")
                      }
                    </span>
                  </div>
                </div>

                {/* Connector line */}
                {idx < formState.inviteCount && (
                  <div className="w-3 h-0.5 bg-gray-700 mx-0.5" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Friend Picker */}
      <div className="relative">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-2">
            <label
              htmlFor="friends-input"
              className="block text-sm font-medium text-gray-300 font-sans"
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
                className="text-xs text-[#EC1D99] hover:text-[#D41C84] transition-colors"
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
              !formState.orderedParticipants?.some(p => p === null)
            }
            className="w-full px-4 py-3 bg-gray-900 border border-gray-800 rounded-xl focus:outline-none focus:border-[#EC1D99] focus:ring-2 focus:ring-[#EC1D99]/20 transition-all text-white placeholder-gray-600 disabled:opacity-50 disabled:cursor-not-allowed font-sans"
          />

          {/* Friend Avatar Popup */}
          {showFriendDropdown && (
            <div
              role="dialog"
              aria-label="Select a friend"
              className="absolute top-full left-0 right-0 mt-2 bg-gray-900 border border-gray-800 rounded-xl shadow-2xl z-20 max-h-64 overflow-y-auto p-3"
            >
              {isSearching ? (
                <div className="flex items-center justify-center py-4 text-gray-400">
                  <Loader className="w-5 h-5 animate-spin mr-2" />
                  <span>Searching...</span>
                </div>
              ) : filteredFriends.length > 0 ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
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
    </div>
  );

  // Render Step 3: Finishing Touches
  const renderStep3 = () => (
    <div className="space-y-6 animate-fadeIn">
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-white mb-2">Finishing Touches</h2>
        <p className="text-gray-400 text-sm">Add hashtags and configure optional settings</p>
      </div>

      {/* Story Summary */}
      <div className="bg-gradient-to-r from-[#EC1D99]/10 to-purple-500/10 rounded-xl p-4 border border-[#EC1D99]/20">
        <h3 className="text-sm font-semibold text-white mb-3">Story Summary</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Title:</span>
            <span className="text-white font-medium">{formState.title || "Untitled"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Visibility:</span>
            <span className="text-white flex items-center gap-1">
              {formState.visibility === "public" ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
              {formState.visibility === "public" ? "Public" : "Private"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Contributors:</span>
            <span className="text-white">{formState.selectedFriends.length + 1} people</span>
          </div>
        </div>
      </div>

      {/* Hashtags Input */}
      <div>
        <label
          htmlFor="hashtag"
          className="block text-sm font-medium text-gray-300 mb-2 font-sans"
        >
          Hashtags <span className="text-gray-500">(optional)</span>
        </label>
        <div className="flex gap-2 items-center">
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
            }}
            placeholder="#adventure #friends"
            className="flex-1 px-4 py-3 bg-gray-900 border border-gray-800 rounded-xl focus:outline-none focus:border-[#EC1D99] focus:ring-2 focus:ring-[#EC1D99]/20 transition-all text-white placeholder-gray-600 font-sans"
            ref={hashtagInputRef}
          />
          <button
            onClick={() => handleAddHashtag()}
            className="px-4 py-3 rounded-xl bg-[#EC1D99] text-white font-semibold hover:bg-[#D41C84] transition-colors"
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
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-800 text-gray-200 rounded-full text-sm border border-gray-700"
              >
                <span>#{tag}</span>
                <button
                  onClick={() => handleRemoveHashtag(tag)}
                  className="text-gray-500 hover:text-white transition-colors font-bold"
                  aria-label={`Remove ${tag}`}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Advanced Options */}
      <div>
        <button
          type="button"
          onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
          className="w-full flex items-center justify-between p-4 bg-gray-900 border border-gray-800 rounded-xl hover:border-gray-700 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-300 font-sans">Advanced Options</span>
            <span className="text-xs text-gray-500">
              ({[
                formState.turnTimerHours && '⏰ Timer',
              ].filter(Boolean).join(', ') || 'Optional'})
            </span>
          </div>
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform ${showAdvancedOptions ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showAdvancedOptions && (
          <div className="mt-3 p-4 bg-gray-900 border border-gray-800 rounded-xl space-y-4">
            {/* Turn Timer */}
            <div>
              <label htmlFor="turn-timer" className="block text-sm font-medium text-gray-300 mb-2 font-sans">
                Turn Timer
              </label>
              <select
                id="turn-timer"
                value={formState.turnTimerHours ?? ''}
                onChange={(e) => {
                  const value = e.target.value === '' ? undefined : parseInt(e.target.value);
                  setFormState(prev => ({ ...prev, turnTimerHours: value }));
                }}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl focus:outline-none focus:border-[#EC1D99] focus:ring-2 focus:ring-[#EC1D99]/20 transition-all text-white font-sans"
              >
                <option value="">No limit</option>
                <option value="6">6 hours</option>
                <option value="12">12 hours</option>
                <option value="24">24 hours</option>
                <option value="48">48 hours</option>
                <option value="72">72 hours</option>
                <option value="168">1 week</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                How long each participant has to add their part
              </p>
            </div>

            {/* Allow Comments Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-300 font-medium font-sans">
                  Allow comments
                </div>
                <div className="text-xs text-gray-500">
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
                  className={`w-11 h-6 rounded-full transition-colors ${formState.allowComments ? "bg-[#EC1D99]" : "bg-gray-700"}`}
                >
                  <span
                    className={`block w-5 h-5 rounded-full bg-white shadow-lg transform transition-transform duration-200 ease-in-out ${formState.allowComments ? "translate-x-5" : "translate-x-0.5"} translate-y-0.5`}
                  ></span>
                </span>
              </label>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col min-h-screen bg-black text-white">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-black/90 backdrop-blur-md border-b border-gray-800 px-4 py-4 pt-[calc(env(safe-area-inset-top,0px)+1rem)] flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={goToPrevStep}
            className="p-2 rounded-full border border-[#EC1D99] text-[#EC1D99] bg-black hover:bg-gray-900 transition-colors"
            aria-label={currentStep === 1 ? "Go back" : "Previous step"}
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

      <main className="flex-1 px-4 py-6 pb-40">
        <div className="max-w-md mx-auto md:max-w-lg">
          {/* Step Indicator */}
          <StepIndicator
            currentStep={currentStep}
            totalSteps={totalSteps}
            onStepClick={(step) => setCurrentStep(step)}
          />

          {/* Error Message */}
          {error && (
            <div
              role="alert"
              aria-live="assertive"
              className="mb-6 p-4 bg-red-900/50 border border-red-800 rounded-xl"
            >
              <p
                className="text-sm text-red-200 font-sans"
              >
                {error}
              </p>
            </div>
          )}

          {/* Step Content */}
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
        </div>
      </main>

      {/* Button Section - Sticky at Bottom */}
      <div className="fixed bottom-0 left-0 right-0 bg-black/95 backdrop-blur-md border-t border-gray-800 px-4 py-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] z-20">
        <div className="max-w-md mx-auto md:max-w-lg flex gap-3">
          {currentStep === 1 ? (
            <button
              onClick={handleBack}
              className="flex-1 px-6 py-3 border border-gray-700 rounded-xl text-gray-300 font-medium hover:bg-gray-900 transition-colors flex items-center justify-center"
              disabled={isLoading}
            >
              Cancel
            </button>
          ) : (
            <button
              onClick={goToPrevStep}
              className="flex-1 px-6 py-3 border border-gray-700 rounded-xl text-gray-300 font-medium hover:bg-gray-900 transition-colors flex items-center justify-center gap-2"
              disabled={isLoading}
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>
          )}

          {currentStep < totalSteps ? (
            <button
              onClick={goToNextStep}
              disabled={
                (currentStep === 1 && !canProceedToStep2) ||
                (currentStep === 2 && !canProceedToStep3)
              }
              className={`flex-1 px-8 py-4 rounded-xl text-white font-bold flex items-center justify-center gap-2 transition-all ${(currentStep === 1 && !canProceedToStep2) || (currentStep === 2 && !canProceedToStep3)
                ? "opacity-50 cursor-not-allowed bg-gray-700"
                : "bg-gradient-to-r from-[#EC1D99] to-[#D41C84] hover:scale-[1.02] shadow-lg"
                }`}
            >
              Next
              <ChevronRight className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={handleCreateStory}
              disabled={!canCreateStory}
              className={`flex-1 px-8 py-4 rounded-xl text-white font-bold flex items-center justify-center gap-2 transition-all shadow-lg ${!canCreateStory
                ? "opacity-50 cursor-not-allowed bg-[#EC1D99]"
                : "bg-gradient-to-r from-[#EC1D99] to-[#D41C84] hover:scale-[1.02]"
                }`}
            >
              {isLoading ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  Create Story
                </>
              )}
            </button>
          )}
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
      `}</style>
    </div>
  );
};

export default CreateStory;
