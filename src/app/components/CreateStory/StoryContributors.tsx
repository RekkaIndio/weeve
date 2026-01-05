import React from "react";
import { Users } from "lucide-react";
import { Friend, CreateStoryFormState, StorySlot } from "./types";
import BrandContributors from "./BrandContributors";
import UserContributors from "./UserContributors";

interface StoryContributorsProps {
    formState: CreateStoryFormState;
    setFormState: React.Dispatch<React.SetStateAction<CreateStoryFormState>>; // Needed for direct updates like visibilityDays
    slots: StorySlot[];
    currentUser?: {
        id: string;
        name: string;
        avatar?: string;
        isInfluencer?: boolean;
        isBrand?: boolean;
        brandSubscriptionStatus?: 'none' | 'active' | 'expired';
    };
    groupId?: string;

    // Handlers
    onPostTypeChange: (postType: 'normal' | 'canon' | 'seed') => void;
    onToggleCanonSlot: (slotIndex: number) => void;
    onVisibilityChange: (visibility: "public" | "private") => void;
    onSlotCountChange: (increment: boolean) => void;
    onReorderSlots: (newSlots: StorySlot[]) => void;
    onRemoveFriend: (friendId: string, slotIndex?: number) => void;
    onFillSlot: (index: number) => void;

    // Reordering state
    isReordering: boolean;
    setIsReordering: (isReordering: boolean) => void;

    // Friend Search & Picker
    friendSearchInput: string;
    onFriendSearchInputChange: (value: string) => void;
    onRefreshFriends?: () => Promise<void>;
    isLoadingFriends?: boolean;
    onAddFriend: (friend: Friend) => void;
    onRequestFriend: (friendId: string) => Promise<boolean>;
    filteredFriends: Friend[];
    showFriendDropdown: boolean;
    setShowFriendDropdown: (show: boolean) => void;
    isSearchingFriends: boolean;

    // Refs
    participantsRef: React.RefObject<HTMLDivElement>;
    friendsInputRef: React.RefObject<HTMLInputElement>;
}

const StoryContributors = ({
    formState,
    setFormState,
    slots,
    currentUser,
    groupId,
    onPostTypeChange,
    onToggleCanonSlot,
    onVisibilityChange,
    onSlotCountChange,
    onReorderSlots,
    onRemoveFriend,
    onFillSlot,
    isReordering,
    setIsReordering,
    friendSearchInput,
    onFriendSearchInputChange,
    onRefreshFriends,
    isLoadingFriends,
    onAddFriend,
    onRequestFriend,
    filteredFriends,
    showFriendDropdown,
    setShowFriendDropdown,
    isSearchingFriends,
    participantsRef,
    friendsInputRef,
}: StoryContributorsProps) => {

    return (
        <div className="space-y-6 overflow-visible" ref={participantsRef}>
            <div className="text-left mb-6">
                <h2 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
                    <Users className="w-5 h-5 text-[#EC1D99]" />
                    Participants
                </h2>
                <p className="text-gray-400 text-sm">Choose who can add to this story</p>
            </div>

            {currentUser?.isBrand ? (
                <BrandContributors
                    formState={formState}
                    setFormState={setFormState}
                    slots={slots}
                    currentUser={currentUser}
                    onPostTypeChange={onPostTypeChange}
                    onToggleCanonSlot={onToggleCanonSlot}
                    onSlotCountChange={onSlotCountChange}
                    onReorderSlots={onReorderSlots}
                    onRemoveFriend={onRemoveFriend}
                    onFillSlot={onFillSlot}
                    isReordering={isReordering}
                    setIsReordering={setIsReordering}
                />
            ) : (
                <UserContributors
                    formState={formState}
                    slots={slots}
                    currentUser={currentUser}
                    groupId={groupId}
                    onVisibilityChange={onVisibilityChange}
                    onSlotCountChange={onSlotCountChange}
                    onReorderSlots={onReorderSlots}
                    onRemoveFriend={onRemoveFriend}
                    onFillSlot={onFillSlot}
                    isReordering={isReordering}
                    setIsReordering={setIsReordering}
                    // Friend Picker Props
                    friendSearchInput={friendSearchInput}
                    onFriendSearchInputChange={onFriendSearchInputChange}
                    onRefreshFriends={onRefreshFriends}
                    isLoadingFriends={isLoadingFriends}
                    onAddFriend={onAddFriend}
                    onRequestFriend={onRequestFriend}
                    filteredFriends={filteredFriends}
                    showFriendDropdown={showFriendDropdown}
                    setShowFriendDropdown={setShowFriendDropdown}
                    isSearchingFriends={isSearchingFriends}
                    friendsInputRef={friendsInputRef}
                />
            )}
        </div >
    );
};

export default StoryContributors;
