import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { X, UserPlus, Search, GitBranch, Users, Lock, Check } from "lucide-react";
import { Story, Contribution, useStore, getSlotProgress, isSlotImmutable } from "@/lib/store";
// @ts-ignore
import confetti from "canvas-confetti";
import { useRouter } from "next/navigation";
import Link from "next/link";
import VideoThumbnail from "../VideoThumbnail";

interface FeedItemForkControlProps {
    isForking: boolean;
    setIsForking: (forking: boolean) => void;
    story: Story;
    currentUser: any;
    showMonetizationModal: 'confirm' | 'insufficient' | 'enable_required' | null;
    setShowMonetizationModal: (type: 'confirm' | 'insufficient' | 'enable_required' | null) => void;
    slotContentMap: Map<number, Contribution>;
    participantsMap: Map<string, any>;
}

export default function FeedItemForkControl({
    isForking,
    setIsForking,
    story,
    currentUser,
    showMonetizationModal,
    setShowMonetizationModal,
    slotContentMap,
    participantsMap
}: FeedItemForkControlProps) {
    const router = useRouter();
    const deductTokens = useStore((state) => state.deductTokens);
    const friends = useStore((state) => state.friends);
    const forkStory = useStore((state) => state.forkStory);

    // Internal State
    // Map of slot index -> assigned user info (userId, avatar, name)
    const [slotAssignments, setSlotAssignments] = useState<Map<number, { userId: string, avatar: string, name: string }>>(new Map());
    const [activeSlotForPicker, setActiveSlotForPicker] = useState<number | null>(null);
    const [showFriendPicker, setShowFriendPicker] = useState(false);
    const [friendSearchQuery, setFriendSearchQuery] = useState("");
    const [friendSearchResults, setFriendSearchResults] = useState<any[]>([]);
    const [isSearchingFriends, setIsSearchingFriends] = useState(false);
    const [showWeeveDetailsModal, setShowWeeveDetailsModal] = useState(false);
    const [weeveTitle, setWeeveTitle] = useState(story.title + (story.title.endsWith("'s Remix") ? "" : " (Remix)"));
    const [weeveDescription, setWeeveDescription] = useState(story.description || "");
    const [isCreatingWeeve, setIsCreatingWeeve] = useState(false);

    // For carousel navigation
    const [currentSlotIndex, setCurrentSlotIndex] = useState(0);
    const maxSlots = story.maxWeeves || 3;
    const carouselRef = useRef<HTMLDivElement>(null);

    // Touch swipe refs
    const touchStartX = useRef(0);
    const touchEndX = useRef(0);

    // Touch handling functions for carousel swipe
    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartX.current = e.touches[0].clientX;
        touchEndX.current = e.touches[0].clientX;
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        touchEndX.current = e.touches[0].clientX;
    };

    const handleTouchEnd = () => {
        const diff = touchStartX.current - touchEndX.current;
        const threshold = 50; // minimum swipe distance

        if (Math.abs(diff) > threshold) {
            if (diff > 0) {
                // Swiped left - go to next
                setCurrentSlotIndex((prev) => (prev < maxSlots - 1 ? prev + 1 : 0));
            } else {
                // Swiped right - go to previous
                setCurrentSlotIndex((prev) => (prev > 0 ? prev - 1 : maxSlots - 1));
            }
        }
    };

    // Friend Search Effect
    useEffect(() => {
        if (!friendSearchQuery.trim()) {
            setFriendSearchResults([]);
            return;
        }

        const delayDebounceFn = setTimeout(async () => {
            setIsSearchingFriends(true);
            try {
                // Mock search for now or use store action if available
                // Assuming filtering local friends or mock logic as in original file
                const results = friends.filter(f => f.name.toLowerCase().includes(friendSearchQuery.toLowerCase()));
                setFriendSearchResults(results);
            } catch (error) {
                console.error("Error searching friends:", error);
            } finally {
                setIsSearchingFriends(false);
            }
        }, 300);

        return () => clearTimeout(delayDebounceFn);
    }, [friendSearchQuery, friends]);

    // Handle Fork Story Logic - now with per-slot assignments
    const handleForkStory = async (customTitle?: string, customDescription?: string) => {
        if (slotAssignments.size === 0) return;

        setIsCreatingWeeve(true);

        // Build the slot indices and contribution IDs to replace
        const slotIndices = Array.from(slotAssignments.keys()).sort((a, b) => a - b);
        const contributionIdsToReplace: string[] = [];
        slotIndices.forEach(slotIndex => {
            const contribution = slotContentMap.get(slotIndex);
            if (contribution) {
                contributionIdsToReplace.push(contribution.id);
            }
        });

        // Build a slot -> userId map for the store function
        const slotToUserMap = new Map<number, string>();
        slotAssignments.forEach((assignment, slotIndex) => {
            slotToUserMap.set(slotIndex, assignment.userId);
        });

        try {
            const result = await forkStory(
                story.id,
                slotToUserMap,
                contributionIdsToReplace,
                customTitle,
                customDescription
            );

            if (result.success && result.storyId) {
                confetti({
                    particleCount: 100,
                    spread: 70,
                    origin: { y: 0.6 }
                });

                // Reset state
                setIsForking(false);
                setSlotAssignments(new Map());
                setActiveSlotForPicker(null);
                setShowWeeveDetailsModal(false);

                // Navigate
                router.push(`/story/${result.storyId}`);

                // Deduct tokens if applicable
                if (story.monetizationCost && story.monetizationCost > 0) {
                    deductTokens(story.monetizationCost);
                }
            } else {
                console.error("Fork failed:", result.error);
                // Could invoke toast here
                alert(result.error || "Failed to create weeve");
            }
        } catch (error) {
            console.error("Fork error:", error);
            alert("An unexpected error occurred");
        } finally {
            setIsCreatingWeeve(false);
        }
    };

    // Assign a user to the currently active slot
    const assignUserToSlot = (userId: string, avatar: string, name: string) => {
        if (activeSlotForPicker === null) return;

        setSlotAssignments(prev => {
            const newMap = new Map(prev);
            newMap.set(activeSlotForPicker, { userId, avatar, name });
            return newMap;
        });
        setActiveSlotForPicker(null);
        setShowFriendPicker(false);
    };

    // Open user picker for a specific slot
    const openPickerForSlot = (slotIndex: number) => {
        if (isSlotImmutable(story, slotIndex)) return;
        setActiveSlotForPicker(slotIndex);
        setShowFriendPicker(false);
        setFriendSearchQuery("");
    };

    return (
        <>
            {/* Monetization Modal */}
            {showMonetizationModal && (
                <div className="absolute inset-0 z-50 bg-black/95 flex items-center justify-center p-6 animate-in zoom-in-95 duration-200">
                    <div className="w-full max-w-sm bg-[#1a1a2e] rounded-3xl p-8 border border-yellow-500/20 shadow-xl relative overflow-hidden">
                        {/* Modal Content based on type */}
                        {showMonetizationModal === 'confirm' && (
                            <div className="flex flex-col items-center text-center">
                                <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-amber-600 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-amber-500/20">
                                    <span className="text-3xl">💎</span>
                                </div>
                                <h3 className="text-2xl font-bold text-white mb-2">Unlock to Weeve</h3>
                                <p className="text-gray-300 mb-6 font-medium">
                                    This story requires <span className="text-yellow-400 font-bold">{story.monetizationCost} tokens</span> to weeve.
                                </p>
                                <div className="flex gap-3 w-full">
                                    <button
                                        onClick={() => setShowMonetizationModal(null)}
                                        className="flex-1 py-3.5 rounded-xl text-gray-400 font-semibold hover:bg-white/5 hover:text-white transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={() => {
                                            setShowMonetizationModal(null);
                                            setIsForking(true); // Proceed to forking flow
                                        }}
                                        className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-600 text-black font-bold hover:shadow-[0_0_20px_rgba(245,158,11,0.4)] transition-all transform hover:scale-105"
                                    >
                                        Unlock & Weeve
                                    </button>
                                </div>
                                <p className="text-xs text-gray-500 mt-4">
                                    Balance: {currentUser?.tokens || 0} tokens
                                </p>
                            </div>
                        )}
                        {showMonetizationModal === 'insufficient' && (
                            <div className="flex flex-col items-center text-center">
                                <div className="w-16 h-16 bg-red-900/50 rounded-full flex items-center justify-center mb-6 border border-red-500/30">
                                    <span className="text-3xl">🚫</span>
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">Insufficient Tokens</h3>
                                <p className="text-gray-300 mb-6 text-sm">
                                    You need {story.monetizationCost} tokens but only have {currentUser?.tokens || 0}.
                                </p>
                                <button
                                    onClick={() => setShowMonetizationModal(null)} // Should direct to purchase
                                    className="w-full py-3.5 rounded-xl bg-[#EC1D99] text-white font-bold mb-3"
                                >
                                    Get More Tokens
                                </button>
                                <button
                                    onClick={() => setShowMonetizationModal(null)}
                                    className="text-gray-400 text-sm hover:text-white"
                                >
                                    Close
                                </button>
                            </div>
                        )}
                        {/* enable_required logic omitted for brevity as it's similar */}
                        {showMonetizationModal === 'enable_required' && (
                            <div className="flex flex-col items-center text-center">
                                <p className="text-white">Please enable monetization in settings first.</p>
                                <button onClick={() => setShowMonetizationModal(null)} className="mt-4 text-gray-400">Close</button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Fork Selection Overlay */}
            {isForking && (
                <div className="absolute inset-0 bg-black/90 z-30 animate-in fade-in duration-200 flex flex-col items-center justify-center pt-20">
                    <button
                        onClick={() => setIsForking(false)}
                        className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors z-40"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    <h2 className="text-2xl font-bold text-white mb-2 text-center">Choose what to replace</h2>
                    <p className="text-gray-400 text-sm mb-8 text-center px-6">
                        Select the parts of the story you want to replace with your own content
                    </p>

                    {/* Stacked Carousel Container */}
                    <div
                        ref={carouselRef}
                        className="relative w-full max-w-md mx-auto h-80 mb-6 flex items-center justify-center"
                        onTouchStart={handleTouchStart}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                    >
                        {Array.from({ length: maxSlots }).map((_, index) => {
                            const contribution = slotContentMap.get(index);
                            const p = participantsMap.get(contribution?.userId || '') || story.participants.find(pt => pt.position === index);
                            const isLocked = isSlotImmutable(story, index);

                            // Calculate position and scale relative to current index
                            const offset = index - currentSlotIndex;
                            const isActive = offset === 0;
                            const isPrev = offset === -1 || (currentSlotIndex === 0 && index === maxSlots - 1);
                            const isNext = offset === 1 || (currentSlotIndex === maxSlots - 1 && index === 0);

                            // Determine position and styling
                            let transform = '';
                            let zIndex = 0;
                            let opacity = 0;
                            let scale = 0.7;

                            if (isActive) {
                                transform = 'translateX(0)';
                                zIndex = 30;
                                opacity = 1;
                                scale = 1;
                            } else if (isPrev) {
                                transform = 'translateX(-60%)';
                                zIndex = 20;
                                opacity = 0.5;
                                scale = 0.75;
                            } else if (isNext) {
                                transform = 'translateX(60%)';
                                zIndex = 20;
                                opacity = 0.5;
                                scale = 0.75;
                            } else {
                                opacity = 0;
                                zIndex = 10;
                            }

                            return (
                                <div
                                    key={index}
                                    className="absolute transition-all duration-300 ease-out"
                                    style={{
                                        transform: `${transform} scale(${scale})`,
                                        zIndex,
                                        opacity,
                                    }}
                                >
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (isActive) {
                                                if (isLocked) return;
                                                openPickerForSlot(index);
                                            } else {
                                                setCurrentSlotIndex(index);
                                            }
                                        }}
                                        className={`relative group ${isActive ? (isLocked ? 'cursor-default' : 'cursor-pointer') : 'cursor-pointer'}`}
                                    >
                                        <div className={`w-64 h-64 rounded-3xl border-2 overflow-hidden transition-all bg-gray-800 relative ${isLocked
                                            ? 'border-gray-600/50 opacity-90'
                                            : slotAssignments.has(index)
                                                ? 'border-[#EC1D99] border-solid'
                                                : 'border-dashed border-white/30 hover:border-[#EC1D99]'
                                            }`}>
                                            {contribution ? (
                                                <>
                                                    {contribution.mediaType === 'video' ? (
                                                        <VideoThumbnail
                                                            src={contribution.mediaUrl || ''}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : contribution.mediaType === 'image' ? (
                                                        <img
                                                            src={contribution.mediaUrl}
                                                            alt="Slot content"
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center p-4 bg-gray-900">
                                                            <p className="text-sm text-white text-center line-clamp-6 leading-tight font-medium">
                                                                {contribution.content}
                                                            </p>
                                                        </div>
                                                    )}
                                                    {/* Avatar Badge */}
                                                    {p && (
                                                        <div className="absolute bottom-2 right-2 w-8 h-8 rounded-full border-2 border-black overflow-hidden">
                                                            <img src={p.avatar} alt={p.name} className="w-full h-full object-cover" />
                                                        </div>
                                                    )}
                                                </>
                                            ) : p ? (
                                                <img
                                                    src={p.avatar}
                                                    alt={p.name}
                                                    className="w-full h-full object-cover opacity-50"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800 p-4">
                                                    <UserPlus className="w-12 h-12 text-gray-500 mb-2" />
                                                    <p className="text-gray-500 text-sm">Empty Slot</p>
                                                </div>
                                            )}

                                            {/* Lock Overlay */}
                                            {isLocked && (
                                                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                                                    <Lock className="w-10 h-10 text-white/70" />
                                                </div>
                                            )}

                                            {/* Assignment Overlay - show assigned user */}
                                            {slotAssignments.has(index) && (
                                                <div className="absolute inset-0 flex items-center justify-center bg-[#EC1D99]/30 backdrop-blur-[2px]">
                                                    {/* Remove button - using div to avoid nested button error */}
                                                    <div
                                                        role="button"
                                                        tabIndex={0}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSlotAssignments(prev => {
                                                                const newMap = new Map(prev);
                                                                newMap.delete(index);
                                                                return newMap;
                                                            });
                                                        }}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter' || e.key === ' ') {
                                                                e.stopPropagation();
                                                                setSlotAssignments(prev => {
                                                                    const newMap = new Map(prev);
                                                                    newMap.delete(index);
                                                                    return newMap;
                                                                });
                                                            }
                                                        }}
                                                        className="absolute top-3 right-3 w-8 h-8 bg-black/60 hover:bg-red-500 rounded-full flex items-center justify-center transition-colors z-10 cursor-pointer"
                                                    >
                                                        <X className="w-4 h-4 text-white" />
                                                    </div>
                                                    <div className="flex flex-col items-center">
                                                        <img
                                                            src={slotAssignments.get(index)!.avatar}
                                                            alt={slotAssignments.get(index)!.name}
                                                            className="w-16 h-16 rounded-full border-4 border-[#EC1D99] shadow-lg"
                                                        />
                                                        <p className="mt-2 text-white font-bold text-sm bg-black/50 px-3 py-1 rounded-full">
                                                            {slotAssignments.get(index)!.name}
                                                        </p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Slot Number Label */}
                                        <div className="absolute -bottom-6 left-0 right-0 text-center">
                                            <span className={`text-sm font-bold ${slotAssignments.has(index) ? 'text-[#EC1D99]' : 'text-white'}`}>
                                                Slot {index + 1}
                                            </span>
                                        </div>
                                    </button>
                                </div>
                            );
                        })}
                    </div>

                    {/* Carousel Indicators */}
                    <div className="flex justify-center gap-2 mb-6">
                        {Array.from({ length: maxSlots }).map((_, index) => (
                            <button
                                key={`indicator-${index}`}
                                onClick={() => setCurrentSlotIndex(index)}
                                className={`w-2 h-2 rounded-full transition-all ${index === currentSlotIndex
                                    ? 'bg-[#EC1D99] w-6'
                                    : 'bg-white/30 hover:bg-white/50'
                                    }`}
                            />
                        ))}
                    </div>

                    {/* Continue Button */}
                    <div className="px-6 w-full max-w-md mt-4">
                        <button
                            onClick={() => {
                                // Reset title/desc to defaults and show weeve details
                                setWeeveTitle(story.title + (story.title.endsWith("'s Remix") ? "" : " (Remix)"));
                                setWeeveDescription(story.description || "");
                                setShowWeeveDetailsModal(true);
                            }}
                            disabled={slotAssignments.size === 0}
                            className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${slotAssignments.size > 0
                                ? 'bg-[#EC1D99] text-white hover:bg-[#d61a88]'
                                : 'bg-gray-800 text-gray-500 cursor-not-allowed'
                                }`}
                        >
                            Continue ({slotAssignments.size})
                        </button>
                    </div>
                </div>
            )}

            {/* Slot User Picker Modal - appears when a slot is tapped */}
            {activeSlotForPicker !== null && (
                <div className="absolute inset-0 z-40 bg-black/90 flex items-center justify-center p-6 animate-in zoom-in-95 duration-200">
                    <div className="w-full max-w-sm bg-[#1a1a2e] rounded-3xl p-6 border border-white/10 flex flex-col max-h-[80vh]">
                        <div className="flex items-center justify-between mb-4 flex-shrink-0">
                            <h3 className="text-xl font-bold text-white">Assign Slot {activeSlotForPicker + 1}</h3>
                            <button onClick={() => setActiveSlotForPicker(null)} className="p-1 hover:bg-white/10 rounded-full">
                                <X className="w-5 h-5 text-gray-400" />
                            </button>
                        </div>

                        {!showFriendPicker ? (
                            <div className="space-y-3">
                                <button
                                    onClick={() => currentUser && assignUserToSlot(currentUser.id, currentUser.avatar, currentUser.name)}
                                    className="w-full flex items-center gap-4 p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-[#EC1D99]/50 transition-all group"
                                >
                                    <img src={currentUser?.avatar} className="w-12 h-12 rounded-full border-2 border-[#EC1D99]" />
                                    <div className="text-left">
                                        <p className="font-bold text-white group-hover:text-[#EC1D99]">Me</p>
                                        <p className="text-xs text-gray-400">Add myself to this slot</p>
                                    </div>
                                </button>
                                <button
                                    onClick={() => setShowFriendPicker(true)}
                                    className="w-full flex items-center gap-4 p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-[#EC1D99]/50 transition-all group"
                                >
                                    <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center">
                                        <Users className="w-6 h-6 text-gray-300" />
                                    </div>
                                    <div className="text-left">
                                        <p className="font-bold text-white group-hover:text-[#EC1D99]">A Friend</p>
                                        <p className="text-xs text-gray-400">Invite someone else</p>
                                    </div>
                                </button>
                            </div>
                        ) : (
                            <div className="flex flex-col flex-1 min-h-0">
                                <div className="mb-4">
                                    <button onClick={() => setShowFriendPicker(false)} className="text-sm text-gray-400 hover:text-white mb-2">&larr; Back</button>
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input
                                            type="text"
                                            value={friendSearchQuery}
                                            onChange={e => setFriendSearchQuery(e.target.value)}
                                            placeholder="Search friends..."
                                            className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#EC1D99]"
                                        />
                                    </div>
                                </div>
                                <div className="flex-1 overflow-y-auto space-y-2">
                                    {(friendSearchResults.length > 0 ? friendSearchResults : friends).map(friend => (
                                        <button
                                            key={friend.id}
                                            onClick={() => assignUserToSlot(friend.id, friend.avatar, friend.name)}
                                            className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/10 transition-colors"
                                        >
                                            <img src={friend.avatar} className="w-10 h-10 rounded-full" />
                                            <span className="text-white font-medium">{friend.name}</span>
                                        </button>
                                    ))}
                                    {friends.length === 0 && !friendSearchQuery && (
                                        <p className="text-center text-gray-500 py-4">No friends found.</p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Weeve Details Modal */}
            {showWeeveDetailsModal && slotAssignments.size > 0 && (
                <div className="absolute inset-0 z-50 bg-black/90 flex items-center justify-center p-6 animate-in zoom-in-95 duration-200">
                    <div className="w-full max-w-sm bg-[#1a1a2e] rounded-3xl p-6 border border-white/10">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-bold text-white">Customise Weeve</h3>
                            <button
                                onClick={() => {
                                    setShowWeeveDetailsModal(false);
                                }}
                                className="p-1 hover:bg-white/10 rounded-full"
                            >
                                <X className="w-5 h-5 text-gray-400" />
                            </button>
                        </div>

                        {/* Show assigned slots summary */}
                        <div className="mb-4 p-3 bg-white/5 rounded-xl">
                            <p className="text-xs text-gray-400 mb-2">Assigned slots:</p>
                            <div className="flex flex-wrap gap-2">
                                {Array.from(slotAssignments.entries()).map(([slotIndex, assignment]) => (
                                    <div key={slotIndex} className="flex items-center gap-1.5 bg-[#EC1D99]/20 px-2 py-1 rounded-full">
                                        <img src={assignment.avatar} className="w-5 h-5 rounded-full" />
                                        <span className="text-xs text-white">Slot {slotIndex + 1}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-4 mb-6">
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Title</label>
                                <input
                                    type="text"
                                    value={weeveTitle}
                                    onChange={e => setWeeveTitle(e.target.value)}
                                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:border-[#EC1D99] focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Description</label>
                                <textarea
                                    value={weeveDescription}
                                    onChange={e => setWeeveDescription(e.target.value)}
                                    rows={3}
                                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:border-[#EC1D99] focus:outline-none resize-none"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    // Skip/Quick Create - use default title/desc
                                    handleForkStory();
                                }}
                                disabled={isCreatingWeeve}
                                className="flex-1 py-3 rounded-xl bg-white/5 text-white font-semibold hover:bg-white/10"
                            >
                                Skip
                            </button>
                            <button
                                onClick={() => {
                                    const t = weeveTitle.trim();
                                    const d = weeveDescription.trim();
                                    handleForkStory(
                                        t !== story.title ? t : undefined,
                                        d !== (story.description || '') ? d : undefined
                                    );
                                }}
                                disabled={isCreatingWeeve}
                                className="flex-1 py-3 rounded-xl bg-[#EC1D99] text-white font-bold hover:bg-[#d61a88]"
                            >
                                {isCreatingWeeve ? 'Creating...' : 'Create Weeve'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
