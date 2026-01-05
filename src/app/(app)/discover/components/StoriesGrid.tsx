import { GitBranch } from "lucide-react";
import MediaWithFallback from "@/app/components/MediaWithFallback";
import { Story } from "@/lib/store";

interface StoriesGridProps {
    stories: Story[];
    openStoryInOverlay: (id: string) => void;
}

export default function StoriesGrid({ stories, openStoryInOverlay }: StoriesGridProps) {
    if (stories.length === 0) return null;

    return (
        <>
            {stories.map((story, idx) => (
                <div
                    key={story.id}
                    onClick={() => openStoryInOverlay(story.id)}
                    className={`relative rounded-xl overflow-hidden group cursor-pointer ${idx % 3 === 0 ? 'row-span-2 aspect-[9/16]' : 'aspect-square'}`}
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
            ))}
        </>
    );
}
