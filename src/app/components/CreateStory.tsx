"use client";

import { ChevronLeft, Loader, Check } from "lucide-react";
import NotificationBell from "./NotificationBell";
import { useCreateStory } from "./CreateStory/useCreateStory";
import StoryDetails from "./CreateStory/StoryDetails";
import StoryContributors from "./CreateStory/StoryContributors";
import StorySettings from "./CreateStory/StorySettings";
import { CreateStoryFormState, Friend } from "./CreateStory/types";

// Re-export types for consumers
export type { CreateStoryFormState, Friend };

interface CreateStoryProps {
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
  const {
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
    handleFillSlot,
    onRequestFriend,

    // Refs
    refs
  } = useCreateStory({
    onBack,
    onCreateStory,
    availableFriends,
    currentUser,
    onDeductTokens,
    groupId,
    onRefreshFriends,
  });

  return (
    <div className="flex flex-col min-h-screen bg-black text-white" ref={refs.topRef}>
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
            <h1 className="text-xl font-bold text-white font-sans">
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
            <StoryDetails
              formState={formState}
              onTitleChange={handleTitleChange}
              onDescriptionChange={handleDescriptionChange}
              hashtagInput={hashtagInput}
              onHashtagInputChange={setHashtagInput}
              onAddHashtag={handleAddHashtag}
              onRemoveHashtag={handleRemoveHashtag}
              hashtagSuggestions={hashtagSuggestions}
              showHashtagDropdown={showHashtagDropdown}
              setShowHashtagDropdown={setShowHashtagDropdown}
              isSearchingHashtags={isSearchingHashtags}
              onSelectHashtagSuggestion={handleSelectHashtagSuggestion}
              titleInputRef={refs.titleInputRef}
              hashtagInputRef={refs.hashtagInputRef}
            />
          </div>

          {/* Section 2: Participants */}
          <div className={`bg-gray-900/40 border border-white/5 rounded-3xl p-6 backdrop-blur-sm shadow-xl transition-all duration-300 ${showFriendDropdown ? 'pb-96' : 'pb-6'}`}>
            <StoryContributors
              formState={formState}
              setFormState={setFormState}
              slots={slots}
              currentUser={currentUser}
              groupId={groupId}
              onPostTypeChange={handlePostTypeChange}
              onToggleCanonSlot={handleToggleCanonSlot}
              onVisibilityChange={handleVisibilityChange}
              onSlotCountChange={handleSlotCountChange}
              onReorderSlots={(newSlots) => setSlots(newSlots)}
              onRemoveFriend={handleRemoveFriend}
              onFillSlot={handleFillSlot}
              isReordering={isReordering}
              setIsReordering={setIsReordering}
              friendSearchInput={friendSearchInput}
              onFriendSearchInputChange={setFriendSearchInput}
              onRefreshFriends={onRefreshFriends}
              onAddFriend={handleAddFriend}
              onRequestFriend={onRequestFriend}
              filteredFriends={filteredFriends}
              showFriendDropdown={showFriendDropdown}
              setShowFriendDropdown={setShowFriendDropdown}
              isSearchingFriends={isSearchingFriends}
              participantsRef={refs.participantsRef}
              friendsInputRef={refs.friendsInputRef}
            />
          </div>

          {/* Section 3: Extras */}
          <div className="bg-gray-900/40 border border-white/5 rounded-3xl p-6 backdrop-blur-sm shadow-xl">
            <StorySettings
              formState={formState}
              setFormState={setFormState}
              currentUser={currentUser}
              showAdvancedOptions={showAdvancedOptions}
              setShowAdvancedOptions={setShowAdvancedOptions}
            />
          </div>

        </div>
      </main>

      {/* Footer Actions */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black via-black/95 to-transparent z-10 pb-[calc(env(safe-area-inset-bottom,0px)+24px)]">
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

    </div>
  );
};

export default CreateStory;
