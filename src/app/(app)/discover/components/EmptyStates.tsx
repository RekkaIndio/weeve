import Link from "next/link";
import { TrendingUp, GitBranch, Sparkles, Play, Heart, Info, Users, Clapperboard, Plus } from "lucide-react";
import MediaWithFallback from "@/app/components/MediaWithFallback";
import { Story } from "@/lib/store";

interface EmptyStatesProps {
    searchQuery: string;
    feedType: string;
    trendingStories: Story[];
    openStoryInOverlay: (id: string) => void;
    setShowFeedInfo: (show: boolean) => void;
    setViewMode: (mode: 'all' | 'groups' | 'people') => void;
}

export default function EmptyStates({
    searchQuery,
    feedType,
    trendingStories,
    openStoryInOverlay,
    setShowFeedInfo,
    setViewMode
}: EmptyStatesProps) {
    // Contextual empty state based on feed type
    if (searchQuery.trim()) {
        // Search with no results - show trending as fallback
        return (
            <div className="space-y-6 col-span-2">
                <div className="text-center py-6">
                    <p className="text-gray-400 text-sm">{`No exact matches for "${searchQuery}"`}</p>
                </div>
                {trendingStories.length > 0 && (
                    <div>
                        <h3 className="text-sm font-bold text-gray-400 mb-3">✨ Discover trending stories instead</h3>
                        <div className="grid grid-cols-2 gap-3">
                            {trendingStories.slice(0, 4).map((story) => (
                                <div
                                    key={story.id}
                                    onClick={() => openStoryInOverlay(story.id)}
                                    className="relative rounded-xl overflow-hidden group aspect-square cursor-pointer"
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
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent p-3 flex flex-col justify-end">
                                        <h3 className="font-bold text-sm line-clamp-2">{story.title}</h3>
                                    </div>
                                    <div className="absolute inset-0 ring-1 ring-inset ring-white/5 rounded-xl group-hover:ring-[#EC1D99]/50 transition-all" />
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    if (feedType === 'seeds') {
        // Seeds tab empty - show info about brand partnerships
        return (
            <div className="py-12 px-4 col-span-2">
                <div className="bg-gradient-to-br from-gray-900 via-gray-900 to-[#1a1a1a] border border-gray-800 rounded-2xl p-8 max-w-lg mx-auto text-center relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-[#EC1D99]/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

                    <div className="relative z-10 flex flex-col items-center">
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#EC1D99]/10 to-purple-500/10 border border-[#EC1D99]/20 flex items-center justify-center mb-6 shadow-[0_0_15px_rgba(236,29,153,0.1)] group-hover:scale-105 transition-transform duration-500">
                            <span className="text-4xl filter drop-shadow-md">🌱</span>
                        </div>

                        <h3 className="text-2xl font-bold text-white mb-2">Seed Stories</h3>
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#EC1D99]/10 border border-[#EC1D99]/20 rounded-full mb-4">
                            <Sparkles className="w-3 h-3 text-[#EC1D99]" />
                            <span className="text-xs font-medium text-[#EC1D99] uppercase tracking-wide">Coming Soon</span>
                        </div>

                        <p className="text-gray-300 text-base leading-relaxed max-w-sm mb-8">
                            Collaborate with your favorite brands. Start with their Seed, add your creative spin, and get featured.
                        </p>

                        <button
                            onClick={() => setShowFeedInfo(true)}
                            className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white px-5 py-2.5 rounded-full font-medium transition-all duration-200 border border-gray-700 hover:border-gray-600"
                        >
                            <Info className="w-4 h-4 text-[#EC1D99]" />
                            <span>How it works</span>
                        </button>
                    </div>
                </div>

                {trendingStories.length > 0 && (
                    <div className="max-w-lg mx-auto mt-12">
                        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <TrendingUp className="w-4 h-4" />
                            While you wait
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                            {trendingStories.slice(0, 2).map((story) => (
                                <div
                                    key={story.id}
                                    onClick={() => openStoryInOverlay(story.id)}
                                    className="relative rounded-xl overflow-hidden group aspect-video cursor-pointer border border-gray-800"
                                >
                                    <MediaWithFallback
                                        src={story.coverImage || story.contributions[0]?.mediaUrl}
                                        alt={story.title}
                                        className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity"
                                    />
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <Play className="w-8 h-8 text-white fill-white/20 opacity-0 group-hover:opacity-100 transition-all transform scale-75 group-hover:scale-100" />
                                    </div>
                                    <div className="absolute bottom-2 left-3 right-3">
                                        <h4 className="text-xs font-bold text-white truncate">{story.title}</h4>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    if (feedType === 'canon') {
        // Canon tab empty
        return (
            <div className="py-12 px-4 col-span-2">
                <div className="bg-gradient-to-br from-gray-900 via-gray-900 to-[#1a1a00] border border-gray-800 rounded-2xl p-8 max-w-lg mx-auto text-center relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-orange-500/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

                    <div className="relative z-10 flex flex-col items-center">
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20 flex items-center justify-center mb-6 shadow-[0_0_15px_rgba(245,158,11,0.1)] group-hover:scale-105 transition-transform duration-500">
                            <span className="text-4xl filter drop-shadow-md">🎬</span>
                        </div>

                        <h3 className="text-2xl font-bold text-white mb-2">Canon Stories</h3>
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full mb-4">
                            <Clapperboard className="w-3 h-3 text-amber-500" />
                            <span className="text-xs font-medium text-amber-500 uppercase tracking-wide">Coming Soon</span>
                        </div>

                        <p className="text-gray-300 text-base leading-relaxed max-w-sm mb-8">
                            Watch premium brand narratives, then separate the threads to weave your own version of the story.
                        </p>

                        <button
                            onClick={() => setShowFeedInfo(true)}
                            className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white px-5 py-2.5 rounded-full font-medium transition-all duration-200 border border-gray-700 hover:border-gray-600"
                        >
                            <Info className="w-4 h-4 text-amber-500" />
                            <span>How it works</span>
                        </button>
                    </div>
                </div>

                {trendingStories.length > 0 && (
                    <div className="max-w-lg mx-auto mt-12">
                        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <TrendingUp className="w-4 h-4" />
                            Watch Now
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                            {trendingStories.slice(0, 2).map((story) => (
                                <div
                                    key={story.id}
                                    onClick={() => openStoryInOverlay(story.id)}
                                    className="relative rounded-xl overflow-hidden group aspect-video cursor-pointer border border-gray-800"
                                >
                                    <MediaWithFallback
                                        src={story.coverImage || story.contributions[0]?.mediaUrl}
                                        alt={story.title}
                                        className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity"
                                    />
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <Play className="w-8 h-8 text-white fill-white/20 opacity-0 group-hover:opacity-100 transition-all transform scale-75 group-hover:scale-100" />
                                    </div>
                                    <div className="absolute bottom-2 left-3 right-3">
                                        <h4 className="text-xs font-bold text-white truncate">{story.title}</h4>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    if (feedType === 'friends') {
        // Friends tab empty
        return (
            <div className="py-8 space-y-6 col-span-2">
                <div className="text-center space-y-4">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#EC1D99]/20 to-pink-500/20 flex items-center justify-center mx-auto">
                        <Heart className="w-8 h-8 text-[#EC1D99]" />
                    </div>
                    <div>
                        <h3 className="font-bold text-lg">No Friend Stories Yet</h3>
                        <p className="text-gray-400 text-sm mt-1 max-w-xs mx-auto">
                            Follow more creators to see their stories here!
                        </p>
                    </div>
                    <button
                        onClick={() => setViewMode('people')}
                        className="inline-flex items-center gap-2 bg-[#EC1D99] text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-[#d61a88] transition-colors"
                    >
                        <Users className="w-4 h-4" />
                        Find People to Follow
                    </button>
                </div>
                {trendingStories.length > 0 && (
                    <div>
                        <h3 className="text-sm font-bold text-gray-400 mb-3">🔥 Popular creators are posting</h3>
                        <div className="grid grid-cols-2 gap-3">
                            {trendingStories.slice(0, 4).map((story) => (
                                <div
                                    key={story.id}
                                    onClick={() => openStoryInOverlay(story.id)}
                                    className="relative rounded-xl overflow-hidden group aspect-square cursor-pointer"
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
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent p-3 flex flex-col justify-end">
                                        <h3 className="font-bold text-sm line-clamp-2">{story.title}</h3>
                                    </div>
                                    <div className="absolute inset-0 ring-1 ring-inset ring-white/5 rounded-xl group-hover:ring-[#EC1D99]/50 transition-all" />
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // Default empty state
    return (
        <div className="py-8 space-y-6 col-span-2">
            {trendingStories.length > 0 ? (
                <div>
                    <h3 className="text-sm font-bold text-gray-400 mb-3">✨ Discover what&apos;s trending</h3>
                    <div className="grid grid-cols-2 gap-3">
                        {trendingStories.slice(0, 6).map((story) => (
                            <div
                                key={story.id}
                                onClick={() => openStoryInOverlay(story.id)}
                                className="relative rounded-xl overflow-hidden group aspect-square cursor-pointer"
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
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent p-3 flex flex-col justify-end">
                                    <h3 className="font-bold text-sm line-clamp-2">{story.title}</h3>
                                </div>
                                <div className="absolute inset-0 ring-1 ring-inset ring-white/5 rounded-xl group-hover:ring-[#EC1D99]/50 transition-all" />
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="text-center space-y-4">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#EC1D99]/20 to-purple-500/20 flex items-center justify-center mx-auto">
                        <Sparkles className="w-8 h-8 text-[#EC1D99]" />
                    </div>
                    <div>
                        <h3 className="font-bold text-lg">Start Your Story</h3>
                        <p className="text-gray-400 text-sm mt-1">Be the first to create something amazing!</p>
                    </div>
                    <Link
                        href="/create-story"
                        className="inline-flex items-center gap-2 bg-[#EC1D99] text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-[#d61a88] transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        Create Story
                    </Link>
                </div>
            )}
        </div>
    );
}
