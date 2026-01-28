"use client";

import dynamic from "next/dynamic";
import { ChevronLeft, Loader, Check, Users, X } from "lucide-react";
import NotificationBell from "./NotificationBell";
import { useCreateStory } from "./CreateStory/useCreateStory";
import StoryDetails from "./CreateStory/StoryDetails";
import StoryContributors from "./CreateStory/StoryContributors";
import StorySettings from "./CreateStory/StorySettings";
import { CreateStoryFormState, Friend } from "./CreateStory/types";
import { formatPrice } from "@/lib/collaborations";

// Dynamic import to avoid SSR issues with PayPal SDK
const PayPalPayment = dynamic(
  () => import("@/app/components/PayPalPayment"),
  {
    ssr: false,
    loading: () => (
      <div className="bg-gray-900 rounded-2xl p-6 text-center">
        <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-gray-400">Loading payment form...</p>
      </div>
    )
  }
);

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
  // Collaboration mode props
  isCollabMode?: boolean;
  collaborator?: Friend;
  collabPriceCents?: number;
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
  isCollabMode = false,
  collaborator,
  collabPriceCents = 0,
}: CreateStoryProps) => {
  const {
    // State
    formState,
    setFormState,
    slots,
    setSlots,
    hashtagSuggestions,
    isSearchingHashtags,
    isLoading,
    error,
    pendingBrandPayment,
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
    activeField,

    // Handlers
    handleTitleChange,
    handleDescriptionChange,
    handleVisibilityChange,
    handlePostTypeChange,
    handleToggleCanonSlot,
    handleAddFriend,
    handleRemoveFriend,
    handleSlotCountChange,
    handleSelectHashtagSuggestion,
    handleCreateStory,
    handleBack,
    handleFillSlot,
    onRequestFriend,
    handleBrandPaymentSuccess,
    handleBrandPaymentCancel,

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
      <header className="sticky top-0 z-50 bg-black/90 backdrop-blur-md border-b border-gray-800 px-4 py-4 pt-[calc(env(safe-area-inset-top,0px)+1rem)] flex items-center justify-between gap-3">
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
              {isCollabMode ? 'Collaboration Request' : 'Create Story'}
            </h1>
            {isCollabMode && collaborator ? (
              <div className="flex items-center gap-1.5 mt-1">
                {collaborator.avatar && (
                  <img
                    src={collaborator.avatar}
                    alt={collaborator.name}
                    className="w-4 h-4 rounded-full"
                  />
                )}
                <span className="text-xs text-gray-400">
                  with @{collaborator.name.toLowerCase().replace(/\s+/g, '_')}
                  {collabPriceCents > 0 && (
                    <span className="text-purple-400 ml-1">• {formatPrice(collabPriceCents)}</span>
                  )}
                </span>
              </div>
            ) : groupId && groupName && (
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
        <div className="w-full max-w-7xl mx-auto space-y-8 overflow-visible">

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
          <div className="bg-gray-900/40 border border-white/5 rounded-3xl p-6 backdrop-blur-sm shadow-xl relative z-30">
            <StoryDetails
              formState={formState}
              onTitleChange={handleTitleChange}
              onDescriptionChange={handleDescriptionChange}
              hashtagSuggestions={hashtagSuggestions}
              isSearchingHashtags={isSearchingHashtags}
              onSelectHashtagSuggestion={handleSelectHashtagSuggestion}
              titleInputRef={refs.titleInputRef}
              activeField={activeField}
            />
          </div>

          {/* Section 2: Participants */}
          <div className={`bg-gray-900/40 border border-white/5 rounded-3xl p-6 backdrop-blur-sm shadow-xl transition-all duration-300 relative z-20 ${showFriendDropdown ? 'pb-96' : 'pb-6'}`}>
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
              onReorderSlots={(newSlots) => {
                const isLocked = formState.visibility === 'public' || !!groupId;
                if (isLocked && slots.length > 0) {
                  const firstSlot = slots[0];
                  // Filter out the locked slot from the new order
                  const reorderedOthers = newSlots.filter((s) => s.id !== firstSlot.id);
                  // Force the first slot to remain at the top
                  setSlots([firstSlot, ...reorderedOthers]);
                } else {
                  setSlots(newSlots);
                }
              }}
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
          <div className="bg-gray-900/40 border border-white/5 rounded-3xl p-6 backdrop-blur-sm shadow-xl relative z-10">
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
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black via-black/95 to-transparent z-50 pb-[calc(env(safe-area-inset-bottom,0px)+24px)]">
        <div className="w-full max-w-7xl mx-auto flex gap-3">
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
            className={`flex-[2] px-8 py-3 rounded-2xl text-white font-bold text-lg flex items-center justify-center gap-2 transition-all shadow-lg ${isCollabMode ? 'shadow-purple-500/25 bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90' : 'shadow-[#EC1D99]/25 bg-[#EC1D99] hover:bg-[#D41C84]'} ${isLoading ? "opacity-70 cursor-wait" : "active:scale-[0.98]"}`}
          >
            {isLoading ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                {isCollabMode ? 'Sending...' : 'Creating...'}
              </>
            ) : isCollabMode ? (
              <>
                <Users className="w-6 h-6" />
                Request {collabPriceCents > 0 ? `(${formatPrice(collabPriceCents)})` : ''}
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

      {/* PayPal Payment Modal for Brand Posts */}
      {pendingBrandPayment && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center bg-black/80 backdrop-blur-sm overflow-y-auto py-8 px-4" style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 2rem)', paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 2rem)' }}>
          <div className="relative w-full max-w-md animate-in fade-in zoom-in duration-200 my-auto">
            <button
              onClick={handleBrandPaymentCancel}
              className="absolute -top-12 right-0 p-2 text-white hover:text-gray-300 transition-colors"
              aria-label="Close"
            >
              <X className="w-6 h-6" />
            </button>
            <PayPalPayment
              type="brand"
              postType={pendingBrandPayment.postType}
              visibilityDays={pendingBrandPayment.visibilityDays}
              storyId={pendingBrandPayment.storyId}
              amount={pendingBrandPayment.amount}
              currency={pendingBrandPayment.currency}
              description={`${pendingBrandPayment.postType.charAt(0).toUpperCase() + pendingBrandPayment.postType.slice(1)} Post - ${pendingBrandPayment.visibilityDays} day${pendingBrandPayment.visibilityDays > 1 ? 's' : ''}`}
              onSuccess={handleBrandPaymentSuccess}
              onError={(err) => console.error('[CreateStory] Brand payment error:', err)}
              onCancel={handleBrandPaymentCancel}
            />
          </div>
        </div>
      )}

    </div>
  );
};

export default CreateStory;

