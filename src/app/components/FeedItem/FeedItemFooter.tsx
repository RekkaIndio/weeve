import { ExternalLink, ChevronDown, UserPlus, Lock } from "lucide-react";
import { Story, Contribution } from "@/lib/store";
import { formatRelativeTime } from "@/lib/format";
import Link from "next/link";
import VideoThumbnail from "../VideoThumbnail"; // Import from sibling/parent depending on location. Original: "./VideoThumbnail"

// Need to make sure VideoThumbnail is accessible. It is in components/VideoThumbnail.tsx
// FeedItemFooter is in components/FeedItem/FeedItemFooter.tsx
// So import should be "../../VideoThumbnail" ? No, FeedItem was in components/FeedItem.tsx.
// VideoThumbnail is "src/app/components/VideoThumbnail.tsx".
// So import from "../VideoThumbnail" is correct if we assume FeedItem/ is sibling to VideoThumbnail.
// Wait, FeedItem/ is a directory inside components/. VideoThumbnail is inside components/.
// So "../../VideoThumbnail" is correct?
// No: components/FeedItem/FeedItemFooter.tsx -> ../../components/VideoThumbnail.tsx ?
// ../VideoThumbnail = components/VideoThumbnail.
// Yes.

interface FeedItemFooterProps {
    story: Story;
    isDescriptionExpanded: boolean;
    setIsDescriptionExpanded: (expanded: boolean) => void;
    isAvatarsExpanded: boolean;
    setIsAvatarsExpanded: (expanded: boolean) => void;
    effectiveOrderedContributions: Contribution[];
    slotContentMap: Map<number, Contribution>;
    currentContribution?: Contribution;
    participantsMap: Map<string, any>; // Using any for Participant type if not exported, or update import
}

export default function FeedItemFooter({
    story,
    isDescriptionExpanded,
    setIsDescriptionExpanded,
    isAvatarsExpanded,
    setIsAvatarsExpanded,
    effectiveOrderedContributions,
    slotContentMap,
    currentContribution,
    participantsMap
}: FeedItemFooterProps) {

    return (
        <div className="absolute bottom-0 left-0 right-0 p-6 pb-6 text-white z-10">
            <h2 className="text-xl font-bold mb-1 font-poppins shadow-black drop-shadow-md flex items-center gap-2 flex-wrap">
                {/* Clickable title for brand posts with product URLs */}
                {story.productUrl ? (
                    <a
                        href={story.productUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1.5 hover:text-[#EC1D99] transition-colors underline decoration-[#EC1D99]/50 underline-offset-2"
                    >
                        {story.title}
                        <ExternalLink className="w-4 h-4 flex-shrink-0" />
                    </a>
                ) : (
                    story.title
                )}
                {/* Canon/Seed badge for brand posts */}
                {story.postType === 'canon' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-500/30 text-purple-300 rounded-full text-xs font-medium" title="Canon Post - Some slots are immutable">
                        🎬 Canon
                    </span>
                )}
                {story.postType === 'seed' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-500/30 text-green-300 rounded-full text-xs font-medium" title="Seed Post - First slot is immutable">
                        🌱 Seed
                    </span>
                )}
                {/* Monetization badge for paid stories */}
                {story.monetizationCost && story.monetizationCost > 0 && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-500/20 text-yellow-300 rounded-full text-xs font-medium border border-yellow-500/30" title={`Entry fee: ${story.monetizationCost} ${story.monetizationCost === 1 ? 'token' : 'tokens'}`}>
                        💎 {story.monetizationCost} {story.monetizationCost === 1 ? 'token' : 'tokens'}
                    </span>
                )}
            </h2>

            {story.description && (
                <div className="mb-2 max-w-[85%]">
                    <p className={`text-sm text-gray-200 ${isDescriptionExpanded ? '' : 'line-clamp-1'}`}>
                        {story.description}
                    </p>
                    {story.description.length > 50 && (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsDescriptionExpanded(!isDescriptionExpanded);
                            }}
                            className="flex items-center gap-0.5 text-xs text-gray-400 hover:text-white transition-colors mt-1"
                        >
                            <span>{isDescriptionExpanded ? 'Show less' : 'Show more'}</span>
                            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isDescriptionExpanded ? 'rotate-180' : ''}`} />
                        </button>
                    )}
                </div>
            )}

            {/* Timestamp */}
            {story.created_at && (
                <span className="text-xs text-gray-400 mb-4 block">
                    {formatRelativeTime(new Date(story.created_at).getTime())}
                </span>
            )}

            <div className="flex items-center mb-3 w-fit">
                {/* Stacked/Collapsed Avatar Display - shows current + context avatars with expand option */}
                <div className="relative">
                    {/* Collapsed View */}
                    {!isAvatarsExpanded ? (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                // Expand if we have more than 1 contribution slot
                                if (effectiveOrderedContributions.length > 1) {
                                    setIsAvatarsExpanded(true);
                                }
                            }}
                            className="flex items-center gap-0 pl-2 py-1 group"
                        >
                            {(() => {
                                // Build unified slots array (Contributions + Assigned + Open)
                                const totalSlots = story.maxWeeves || 3;
                                const slots: Array<{
                                    type: 'contribution' | 'assigned' | 'open';
                                    data?: any;
                                    id: string;
                                    index: number;
                                }> = [];

                                for (let i = 0; i < totalSlots; i++) {
                                    const contribution = slotContentMap.get(i);

                                    if (contribution) {
                                        slots.push({ type: 'contribution', data: contribution, id: `c-${i}`, index: i });
                                    } else {
                                        const participant = story.participants.find(p => p.position === i);
                                        if (participant) {
                                            slots.push({ type: 'assigned', data: participant, id: `a-${i}`, index: i });
                                        } else {
                                            slots.push({ type: 'open', id: `o-${i}`, index: i });
                                        }
                                    }
                                }
                                const total = slots.length;

                                const activeSlotIndex = currentContribution
                                    ? slots.findIndex(s => s.type === 'contribution' && s.data.id === currentContribution.id)
                                    : -1;

                                const pivot = activeSlotIndex >= 0 ? activeSlotIndex : 0;

                                const visibleIndices: number[] = [];
                                for (let i = 0; i < total; i++) visibleIndices.push(i);

                                const hiddenCount = 0;

                                return (
                                    <>
                                        {visibleIndices.map((idx, displayIdx) => {
                                            const slot = slots[idx];
                                            const isActive = idx === activeSlotIndex;

                                            if (slot.type === 'contribution') {
                                                const contribution = slot.data;
                                                const p = participantsMap.get(contribution.userId);
                                                const avatarUrl = p?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(contribution.userName || 'Unknown')}`;
                                                const name = p?.name || contribution.userName || 'Unknown';

                                                return (
                                                    <Link
                                                        key={slot.id}
                                                        href={`/profile/${contribution.userId}`}
                                                        onClick={(e) => e.stopPropagation()}
                                                        title={`${idx + 1}. ${name}${isActive ? ' (playing)' : ''}`}
                                                        className={`relative rounded-full flex-none transition-all duration-300 ${displayIdx !== 0 ? '-ml-3' : ''} ${isActive
                                                            ? 'z-20 scale-110 opacity-100'
                                                            : 'z-10 opacity-70 group-hover:opacity-90'
                                                            }`}
                                                    >
                                                        <img
                                                            src={avatarUrl}
                                                            alt={name}
                                                            className={`w-9 h-9 min-w-[36px] aspect-square object-cover block rounded-full border-2 flex-shrink-0 transition-all duration-300 ${isActive
                                                                ? 'border-[#EC1D99] shadow-[0_0_10px_#EC1D99]'
                                                                : 'border-black/80'
                                                                }`}
                                                        />
                                                        {isActive && (
                                                            <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-[#EC1D99] rounded-full animate-pulse" />
                                                        )}
                                                    </Link>
                                                );
                                            } else if (slot.type === 'assigned') {
                                                const p = slot.data;
                                                return (
                                                    <Link
                                                        key={slot.id}
                                                        href={`/profile/${p.id}`}
                                                        onClick={(e) => e.stopPropagation()}
                                                        title={`${idx + 1}. Waiting for ${p.name}`}
                                                        className={`relative rounded-full flex-none transition-all duration-300 ${displayIdx !== 0 ? '-ml-3' : ''} z-10 opacity-70 group-hover:opacity-90 grayscale`}
                                                    >
                                                        <img
                                                            src={p.avatar}
                                                            alt={p.name}
                                                            className="w-9 h-9 min-w-[36px] aspect-square object-cover block rounded-full border-2 border-dashed border-gray-400 flex-shrink-0"
                                                        />
                                                    </Link>
                                                );
                                            } else {
                                                // Open Slot
                                                return (
                                                    <div
                                                        key={slot.id}
                                                        className={`relative flex-none transition-all duration-300 ${displayIdx !== 0 ? '-ml-3' : ''} z-5`}
                                                        title="Open slot"
                                                    >
                                                        <div className="w-9 h-9 min-w-[36px] flex items-center justify-center rounded-full border-2 border-dashed border-[#EC1D99] bg-[#EC1D99]/10 text-[#EC1D99] text-sm font-bold backdrop-blur-sm">
                                                            +
                                                        </div>
                                                    </div>
                                                );
                                            }
                                        })}

                                        {/* +X More Badge */}
                                        {hiddenCount > 0 && (
                                            <div
                                                className="-ml-2 z-30 flex items-center justify-center w-9 h-9 rounded-full bg-gray-800/90 border-2 border-gray-600 text-white text-[10px] font-bold backdrop-blur-sm group-hover:bg-gray-700 group-hover:border-[#EC1D99]/50 transition-all"
                                                title={`${hiddenCount} more slot${hiddenCount > 1 ? 's' : ''}`}
                                            >
                                                +{hiddenCount}
                                            </div>
                                        )}
                                    </>
                                );
                            })()}
                        </button>
                    ) : (
                        /* Expanded View - All participants visible */
                        <div className="flex items-center gap-0 pl-2 py-1 animate-in slide-in-from-left-2 duration-300">
                            {(() => {
                                // Build unified slots array (Contributions + Assigned + Open)
                                const totalSlots = story.maxWeeves || 3;
                                const slots: Array<{
                                    type: 'contribution' | 'assigned' | 'open';
                                    data?: any;
                                    id: string;
                                    index: number;
                                }> = [];

                                for (let i = 0; i < totalSlots; i++) {
                                    const contribution = slotContentMap.get(i);

                                    if (contribution) {
                                        slots.push({ type: 'contribution', data: contribution, id: `c-${i}`, index: i });
                                    } else {
                                        const participant = story.participants.find(p => p.position === i);
                                        if (participant) {
                                            slots.push({ type: 'assigned', data: participant, id: `a-${i}`, index: i });
                                        } else {
                                            slots.push({ type: 'open', id: `o-${i}`, index: i });
                                        }
                                    }
                                }

                                const activeSlotIndex = currentContribution
                                    ? slots.findIndex(s => s.type === 'contribution' && s.data.id === currentContribution.id)
                                    : -1;

                                return slots.map((slot, idx) => {
                                    const isActive = idx === activeSlotIndex;

                                    if (slot.type === 'contribution') {
                                        const contribution = slot.data;
                                        const p = participantsMap.get(contribution.userId);
                                        const avatarUrl = p?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(contribution.userName || 'Unknown')}`;
                                        const name = p?.name || contribution.userName || 'Unknown';

                                        return (
                                            <Link
                                                key={slot.id}
                                                href={`/profile/${contribution.userId}`}
                                                onClick={(e) => e.stopPropagation()}
                                                title={`${idx + 1}. ${name}${isActive ? ' (playing)' : ''}`}
                                                className={`relative rounded-full flex-none transition-all duration-300 ${idx !== 0 ? '-ml-3' : ''} ${isActive
                                                    ? 'z-20 scale-110 opacity-100'
                                                    : 'z-10 opacity-70 hover:opacity-100'
                                                    }`}
                                            >
                                                <img
                                                    src={avatarUrl}
                                                    alt={name}
                                                    className={`w-8 h-8 min-w-[32px] aspect-square object-cover block rounded-full border-2 flex-shrink-0 transition-all duration-300 ${isActive
                                                        ? 'border-[#EC1D99] shadow-[0_0_8px_#EC1D99]'
                                                        : 'border-black/80'
                                                        }`}
                                                />
                                                {isActive && (
                                                    <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-[#EC1D99] rounded-full animate-pulse" />
                                                )}
                                            </Link>
                                        );
                                    } else if (slot.type === 'assigned') {
                                        const p = slot.data;
                                        return (
                                            <Link
                                                key={slot.id}
                                                href={`/profile/${p.id}`}
                                                onClick={(e) => e.stopPropagation()}
                                                title={`${idx + 1}. Waiting for ${p.name}`}
                                                className={`relative rounded-full flex-none transition-all duration-300 ${idx !== 0 ? '-ml-3' : ''} z-10 opacity-70 group-hover:opacity-90 grayscale`}
                                            >
                                                <img
                                                    src={p.avatar}
                                                    alt={p.name}
                                                    className="w-8 h-8 min-w-[32px] aspect-square object-cover block rounded-full border-2 border-dashed border-gray-400 flex-shrink-0"
                                                />
                                            </Link>
                                        );
                                    } else {
                                        // Open Slot
                                        return (
                                            <div
                                                key={slot.id}
                                                className={`relative flex-none transition-all duration-300 ${idx !== 0 ? '-ml-3' : ''} z-5`}
                                                title="Open slot"
                                            >
                                                <div className="w-8 h-8 min-w-[32px] flex items-center justify-center rounded-full border-2 border-dashed border-[#EC1D99] bg-[#EC1D99]/10 text-[#EC1D99] text-xs font-bold backdrop-blur-sm">
                                                    +
                                                </div>
                                            </div>
                                        );
                                    }
                                });
                            })()}

                            {/* Collapse button */}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsAvatarsExpanded(false);
                                }}
                                className="-ml-1 z-30 flex items-center justify-center w-7 h-7 rounded-full bg-gray-800/80 border border-gray-600 text-gray-300 hover:text-white hover:bg-gray-700 transition-all"
                                title="Collapse"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {story.hashtags && story.hashtags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                    {story.hashtags.map((tag, index) => (
                        <span key={index} className="text-xs font-medium text-[#EC1D99] drop-shadow-md">
                            #{tag}
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
}
