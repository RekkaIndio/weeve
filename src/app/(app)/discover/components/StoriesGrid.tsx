import { GitBranch } from "lucide-react";
import MediaWithFallback from "@/app/components/MediaWithFallback";
import { Story } from "@/lib/store";
import { useState, useEffect, useRef } from "react";

interface StoriesGridProps {
    stories: Story[];
    openStoryInOverlay: (id: string) => void;
}

function StoryGridItem({
    story,
    index,
    openStoryInOverlay
}: {
    story: Story;
    index: number;
    openStoryInOverlay: (id: string) => void;
}) {
    // Get all valid contributions that have media
    const mediaContributions = story.contributions.filter(c => c.mediaUrl);

    // If no contributions, use cover image or fallback
    const hasMedia = mediaContributions.length > 0;

    const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
    const [isHovering, setIsHovering] = useState(false);

    // Auto-advance logic
    const advanceMedia = () => {
        if (!hasMedia) return;
        setCurrentMediaIndex(prev => (prev + 1) % mediaContributions.length);
    };

    // For non-video content, auto-advance after a delay
    useEffect(() => {
        if (!hasMedia) return;

        const currentContribution = mediaContributions[currentMediaIndex];
        const isVideo = currentContribution?.mediaType === 'video' ||
            (currentContribution?.mediaUrl && ['.mp4', '.webm', '.ogg', '.mov'].some(ext => currentContribution.mediaUrl!.toLowerCase().includes(ext)));

        if (!isVideo) {
            const timer = setTimeout(advanceMedia, 3000); // 3 seconds for images/text
            return () => clearTimeout(timer);
        }
    }, [currentMediaIndex, hasMedia, mediaContributions]);

    const currentMedia = hasMedia ? mediaContributions[currentMediaIndex] : null;
    const mediaUrl = currentMedia?.mediaUrl || story.coverImage || story.contributions[0]?.mediaUrl;

    return (
        <div
            onClick={() => openStoryInOverlay(story.id)}
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
            className={`relative rounded-xl overflow-hidden group cursor-pointer ${index % 3 === 0 ? 'row-span-2 aspect-[9/16]' : 'aspect-square'}`}
        >
            <MediaWithFallback
                key={`${story.id}-${currentMediaIndex}`} // Re-mount on index change to ensure clean state
                src={mediaUrl}
                alt={story.title}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                loop={false} // Don't loop individual videos, we want to go to next one
                onEnded={advanceMedia}
            />

            {/* Progress Indicators (like Instagram Stories) */}
            {hasMedia && mediaContributions.length > 1 && (
                <div className="absolute top-2 left-2 right-2 flex gap-1 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
                    {mediaContributions.map((_, idx) => (
                        <div key={idx} className="h-0.5 flex-1 bg-white/30 rounded-full overflow-hidden">
                            <div
                                className={`h-full bg-white transition-all duration-300 ${idx === currentMediaIndex ? 'w-full' : idx < currentMediaIndex ? 'w-full' : 'w-0'
                                    }`}
                            />
                        </div>
                    ))}
                </div>
            )}

            {story.forkedFromStoryId && (
                <div className="absolute top-2 right-2 z-10 bg-black/60 backdrop-blur-sm p-1.5 rounded-full border border-white/10">
                    <GitBranch className="w-3 h-3 text-[#EC1D99]" />
                </div>
            )}
            {/* Open pill indicator for active stories */}
            {!story.forkedFromStoryId && story.status === 'active' && ((story.maxWeeves || 0) - (story.contributions?.length || 0)) > 0 && (
                <div className="absolute top-2 right-2 z-10">
                    <div className="flex items-center gap-1 bg-green-500/90 px-2 py-0.5 rounded-full">
                        <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                        <span className="text-[10px] font-bold text-white uppercase">Open</span>
                    </div>
                </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent p-3 flex flex-col justify-end">
                <h3 className="font-bold text-sm line-clamp-2 mb-1">{story.title}</h3>
                <div className="flex items-center gap-1 text-xs text-gray-300">
                    <div className="flex -space-x-1">
                        {story.participants.slice(0, 2).map(p => (
                            <MediaWithFallback
                                key={`${p.id}-${p.position}`}
                                src={p.avatar}
                                className="w-4 h-4 rounded-full border border-black"
                            />
                        ))}
                    </div>
                    <span>{story.participants.length} weevers</span>
                </div>
            </div>
            {/* Hover overlay with pink glow */}
            <div className="absolute inset-0 ring-1 ring-inset ring-white/5 rounded-xl group-hover:ring-[#EC1D99]/50 group-hover:shadow-lg group-hover:shadow-[#EC1D99]/20 transition-all duration-300" />
        </div>
    );
}

export default function StoriesGrid({ stories, openStoryInOverlay }: StoriesGridProps) {
    if (stories.length === 0) return null;

    return (
        <>
            {stories.map((story, idx) => (
                <StoryGridItem
                    key={story.id}
                    story={story}
                    index={idx}
                    openStoryInOverlay={openStoryInOverlay}
                />
            ))}
        </>
    );
}
