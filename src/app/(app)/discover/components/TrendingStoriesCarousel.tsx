import { TrendingUp, GitBranch } from "lucide-react";
import MediaWithFallback from "@/app/components/MediaWithFallback";
import { Story } from "@/lib/store";

interface TrendingStoriesCarouselProps {
    trendingStories: Story[];
    openStoryInOverlay: (id: string) => void;
}

export default function TrendingStoriesCarousel({ trendingStories, openStoryInOverlay }: TrendingStoriesCarouselProps) {
    if (trendingStories.length === 0) return null;

    return (
        <div className="mb-2">
            <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-[#EC1D99]" />
                <h2 className="text-lg font-bold">Trending</h2>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
                {trendingStories.map((story) => (
                    <div
                        key={story.id}
                        onClick={() => openStoryInOverlay(story.id)}
                        className="relative flex-shrink-0 w-36 aspect-[9/14] rounded-2xl overflow-hidden group cursor-pointer"
                    >
                        <MediaWithFallback
                            src={story.coverImage || story.contributions[0]?.mediaUrl}
                            alt={story.title}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                        {story.forkedFromStoryId && (
                            <div className="absolute top-2 right-2 z-10 bg-black/60 backdrop-blur-sm p-1.5 rounded-full border border-white/10">
                                <GitBranch className="w-3 h-3 text-[#EC1D99]" />
                            </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                        <div className="absolute inset-0 ring-1 ring-inset ring-white/10 rounded-2xl group-hover:ring-[#EC1D99]/50 transition-all" />
                        <div className="absolute bottom-0 left-0 right-0 p-3">
                            <h3 className="font-bold text-xs line-clamp-2 mb-1">{story.title}</h3>
                            <div className="flex items-center gap-1 text-[10px] text-gray-300">
                                <div className="flex -space-x-1">
                                    {story.participants.slice(0, 2).map(p => (
                                        <MediaWithFallback
                                            key={`${p.id}-${p.position}`}
                                            src={p.avatar}
                                            className="w-3 h-3 rounded-full border border-black"
                                        />
                                    ))}
                                </div>
                                <span>{story.participants.length}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
