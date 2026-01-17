import React from "react";
import { Globe, Lock, Loader, UserPlus } from "lucide-react";
import { CreateStoryFormState, StorySlot, Friend } from "./types";
import NormalStorySlots from "./NormalStorySlots";

interface UserContributorsProps {
    formState: CreateStoryFormState;
    slots: StorySlot[];
    currentUser?: {
        id: string;
        name: string;
        avatar?: string;
    };
    groupId?: string;
    onVisibilityChange: (visibility: "public" | "private") => void;
    onSlotCountChange: (increment: boolean) => void;
    onReorderSlots: (newSlots: StorySlot[]) => void;
    onRemoveFriend: (friendId: string, slotIndex?: number) => void;
    onFillSlot: (index: number) => void;
    isReordering: boolean;
    setIsReordering: (isReordering: boolean) => void;

    // Friend Picker Props
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
    friendsInputRef: React.RefObject<HTMLInputElement>;
}

const UserContributors = ({
    formState,
    slots,
    currentUser,
    groupId,
    onVisibilityChange,
    onSlotCountChange,
    onReorderSlots,
    onRemoveFriend,
    onFillSlot,
    isReordering,
    setIsReordering,
    // Friend Picker
    friendSearchInput,
    onFriendSearchInputChange,
    onRefreshFriends,
    onAddFriend,
    onRequestFriend,
    filteredFriends,
    showFriendDropdown,
    setShowFriendDropdown,
    isSearchingFriends,
    friendsInputRef,
}: UserContributorsProps) => {
    // State to control friend search visibility
    const [isFriendSearchVisible, setIsFriendSearchVisible] = React.useState(false);

    // Enhanced onFillSlot to show search
    const handleFillSlot = (index: number) => {
        setIsFriendSearchVisible(true);
        setShowFriendDropdown(true);
        onFillSlot(index);
    };

    return (
        <>
            {/* Story Visibility Selection - Hidden if groupId is present */}
            {!groupId && (
                <div className="flex items-center justify-between p-4 bg-gray-800/50 border border-gray-700/50 rounded-2xl mb-6">
                    <div className="flex flex-col">
                        <span className="text-sm font-bold text-white flex items-center gap-2 font-sans">
                            {formState.visibility === "public" ? (
                                <>
                                    <Globe className="w-4 h-4 text-gray-400" />
                                    Public Story
                                </>
                            ) : (
                                <>
                                    <Lock className="w-4 h-4 text-[#EC1D99]" />
                                    Private Story
                                </>
                            )}
                        </span>
                        <span className="text-xs text-gray-500 mt-1 font-sans">
                            {formState.visibility === "public"
                                ? "Anyone can view and contribute"
                                : "Only invited friends can view and contribute"}
                        </span>
                    </div>

                    {/* Custom Toggle Switch */}
                    <button
                        type="button"
                        role="switch"
                        aria-checked={formState.visibility === "private"}
                        onClick={() => onVisibilityChange(formState.visibility === "public" ? "private" : "public")}
                        className={`w-12 h-7 rounded-full transition-colors duration-200 ease-in-out relative focus:outline-none focus:ring-2 focus:ring-[#EC1D99] focus:ring-offset-2 focus:ring-offset-gray-900 ${formState.visibility === "private" ? 'bg-[#EC1D99]' : 'bg-gray-700'
                            }`}
                    >
                        <div
                            className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-200 ease-in-out absolute top-1 left-1 ${formState.visibility === "private" ? 'translate-x-5' : 'translate-x-0'
                                }`}
                        />
                    </button>
                </div>
            )}

            {/* Standard Slots UI */}
            <NormalStorySlots
                slots={slots}
                inviteCount={formState.inviteCount}
                onSlotCountChange={onSlotCountChange}
                onReorderSlots={onReorderSlots}
                onRemoveFriend={onRemoveFriend}
                onFillSlot={handleFillSlot}
                isReordering={isReordering}
                setIsReordering={setIsReordering}
                currentUser={currentUser}
                isLockedSlot1={(formState.visibility === 'public' || !!groupId)}
            />

            {/* Friend Picker - hidden until triggered */}
            <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isFriendSearchVisible ? 'max-h-[1000px] opacity-100 mt-6' : 'max-h-0 opacity-0 mt-0'}`}>
                <div className="relative">
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
                                        if (onRefreshFriends) await onRefreshFriends();
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
                            ref={friendsInputRef}
                            type="text"
                            value={friendSearchInput}
                            onChange={(e) => onFriendSearchInputChange(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    e.preventDefault();
                                    if (filteredFriends.length > 0) {
                                        onAddFriend(filteredFriends[0]);
                                    }
                                }
                            }}
                            onFocus={() => setShowFriendDropdown(true)}
                            onBlur={() => {
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
                                className="mt-3 bg-gray-900/95 backdrop-blur-md border-2 border-gray-700/50 rounded-2xl shadow-2xl z-50 max-h-96 overflow-y-auto p-4"
                            >
                                {/* Dropdown Header */}
                                <div className="mb-3 pb-2 border-b border-gray-700/50">
                                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                        Select Friends to Add
                                    </h3>
                                </div>

                                {isSearchingFriends ? (
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
                                                            onAddFriend(friend);
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
                                                                await onRequestFriend(friend.id);
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
        </>
    );
};

export default UserContributors;
