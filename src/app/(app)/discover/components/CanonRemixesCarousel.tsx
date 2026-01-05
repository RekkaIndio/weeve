import { Clapperboard, Play, GitBranch } from "lucide-react";
import MediaWithFallback from "@/app/components/MediaWithFallback";
import VerificationBadge from "@/app/components/VerificationBadge";
import { Story } from "@/lib/store";

interface CanonRemixesCarouselProps {
    stories: Story[];
    openStoryInOverlay: (id: string) => void;
}

export default function CanonRemixesCarousel({ stories, openStoryInOverlay }: CanonRemixesCarouselProps) {
    const canonStories = stories
        .filter(s => s.postType === 'canon' && s.status === 'active' && s.contributions && s.contributions.length > 0)
        .sort((a, b) => (b.likes || 0) - (a.likes || 0))
        .slice(0, 10);

    return (
        <div className="mb-8 mt-4">
            <div className="flex items-center gap-2 mb-4">
                <Clapperboard className="w-5 h-5 text-amber-400" />
                <span className="bg-gradient-to-r from-amber-400 to-amber-600 text-transparent bg-clip-text text-lg font-bold">
                    Canon Remixes
                </span>
                <span className="text-[10px] bg-amber-500/10 px-2 py-0.5 rounded-full text-amber-300 border border-amber-500/20">
                    Watch & Fork
                </span>
            </div>

            {canonStories.length > 0 ? (
                <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4">
                    {canonStories.map((story) => (
                        <div
                            key={story.id}
                            onClick={() => openStoryInOverlay(story.id)}
                            className="relative flex-shrink-0 w-72 aspect-video rounded-2xl overflow-hidden group shadow-lg shadow-black/50 border border-amber-500/20 hover:border-amber-500/60 transition-all cursor-pointer"
                        >
                            <MediaWithFallback
                                src={story.coverImage || story.contributions[0]?.mediaUrl}
                                alt={story.title}
                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                <div className="w-12 h-12 bg-amber-500/90 rounded-full flex items-center justify-center backdrop-blur-md shadow-xl scale-75 group-hover:scale-100 transition-transform">
                                    <Play className="w-5 h-5 text-black fill-black ml-1" />
                                </div>
                            </div>

                            <div className="absolute top-3 left-3 flex items-center gap-2">
                                <div className="bg-black/60 backdrop-blur-md rounded-full pl-1 pr-2 py-1 flex items-center gap-1 border border-white/10">
                                    <MediaWithFallback
                                        src={story.groupAvatar || story.participants[0]?.avatar}
                                        className="w-4 h-4 rounded-full"
                                    />
                                    <span className="text-[10px] font-bold text-white/90 truncate max-w-[80px]">
                                        {story.participants[0]?.name || 'Brand'}
                                    </span>
                                    <VerificationBadge isVerified={true} tier="gold" size="sm" />
                                </div>
                            </div>

                            <div className="absolute bottom-0 left-0 right-0 p-4">
                                <h3 className="font-bold text-base mb-1 leading-tight text-white group-hover:text-amber-400 transition-colors">
                                    {story.title}
                                </h3>
                                <div className="flex items-center justify-between text-xs mt-2">
                                    <span className="text-gray-300 bg-black/50 px-2 py-1 rounded-md backdrop-blur-sm flex items-center gap-1">
                                        <GitBranch className="w-3 h-3 text-amber-400" />
                                        {story.comments?.length || 0} forks
                                    </span>
                                    <div className="flex -space-x-2">
                                        {story.participants.slice(0, 3).map((p, i) => (
                                            <MediaWithFallback
                                                key={i}
                                                src={p.avatar}
                                                className="w-5 h-5 rounded-full border border-black"
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="absolute inset-0 ring-1 ring-inset ring-white/5 rounded-2xl group-hover:ring-amber-500/50 transition-all duration-300" />
                        </div>
                    ))}
                </div>
            ) : (
                <div className="bg-gray-900/50 border border-dashed border-gray-800 rounded-xl p-6 text-center mx-4">
                    <p className="text-gray-500 text-sm">Brand Canon Stories Coming Soon. Check back soon!</p>
                </div>
            )}
        </div>
    );
}
