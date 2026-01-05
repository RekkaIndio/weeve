import { Zap } from "lucide-react";
import MediaWithFallback from "@/app/components/MediaWithFallback";
import VerificationBadge from "@/app/components/VerificationBadge";
import { Story } from "@/lib/store";

interface FeaturedSeedsProps {
    stories: Story[];
    openStoryInOverlay: (id: string) => void;
}

export default function FeaturedSeeds({ stories, openStoryInOverlay }: FeaturedSeedsProps) {
    const seedStories = stories
        .filter(s => s.postType === 'seed' && s.status === 'active' && s.contributions && s.contributions.length > 0)
        .sort((a, b) => {
            const dateA = new Date(a.created_at || 0).getTime();
            const dateB = new Date(b.created_at || 0).getTime();
            return dateB - dateA;
        })
        .slice(0, 10);

    return (
        <div className="mb-6">
            <div className="flex items-center gap-2 mb-4">
                <span className="bg-gradient-to-r from-[#EC1D99] to-purple-500 text-transparent bg-clip-text text-lg font-bold">
                    🌱 Featured Seeds
                </span>
            </div>

            {seedStories.length > 0 ? (
                <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4">
                    {seedStories.map((story) => (
                        <div
                            key={story.id}
                            onClick={() => openStoryInOverlay(story.id)}
                            className="relative flex-shrink-0 w-64 aspect-[16/9] rounded-2xl overflow-hidden group shadow-lg shadow-black/50 border border-white/10 hover:border-[#EC1D99]/50 transition-all cursor-pointer"
                        >
                            <MediaWithFallback
                                src={story.coverImage || story.contributions[0]?.mediaUrl}
                                alt={story.title}
                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

                            {/* Brand Badge */}
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
                                <h3 className="font-bold text-base mb-1 leading-tight group-hover:text-[#EC1D99] transition-colors">
                                    {story.title}
                                </h3>
                                <div className="flex items-center justify-between text-xs mt-2">
                                    <span className="text-gray-300 bg-black/50 px-2 py-1 rounded-md backdrop-blur-sm">
                                        {(story.maxWeeves || 0) - (story.contributions?.length || 0)} slots left
                                    </span>
                                    <span className="text-[#EC1D99] font-medium flex items-center gap-1">
                                        Join <Zap className="w-3 h-3" />
                                    </span>
                                </div>
                            </div>

                            <div className="absolute inset-0 ring-1 ring-inset ring-white/10 rounded-2xl group-hover:ring-[#EC1D99] transition-all duration-300" />
                        </div>
                    ))}
                </div>
            ) : (
                <div className="bg-gray-900/50 border border-dashed border-gray-800 rounded-xl p-6 text-center mx-4">
                    <p className="text-gray-500 text-sm">Seed stories are coming. Check back soon!</p>
                </div>
            )}
        </div>
    );
}
