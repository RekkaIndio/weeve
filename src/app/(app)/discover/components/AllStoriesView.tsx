import { useState } from "react";
import { Sparkles, Info } from "lucide-react";
import { Story } from "@/lib/store";
import { Friend as FriendType } from '@/lib/friends';

import FeaturedSeeds from "./FeaturedSeeds";
import TrendingStoriesCarousel from "./TrendingStoriesCarousel";
import CanonRemixesCarousel from "./CanonRemixesCarousel";
import PeopleSearchResults from "./PeopleSearchResults";
import StoriesGrid from "./StoriesGrid";
import EmptyStates from "./EmptyStates";
import FeedInfoModal from "./FeedInfoModal";

interface AllStoriesViewProps {
    searchQuery: string;
    feedType: string;
    stories: Story[];
    filteredStories: Story[];
    trendingStories: Story[];
    peopleResults: FriendType[];
    openStoryInOverlay: (id: string) => void;
    setViewMode: (mode: 'all' | 'groups' | 'people') => void;
}

export default function AllStoriesView({
    searchQuery,
    feedType,
    stories,
    filteredStories,
    trendingStories,
    peopleResults,
    openStoryInOverlay,
    setViewMode
}: AllStoriesViewProps) {
    const [showFeedInfo, setShowFeedInfo] = useState(false);

    return (
        <div className="space-y-6 px-4">
            {/* Featured Seeds Carousel - ONLY in 'For You' or 'Trending' to drive discovery */}
            {!searchQuery.trim() && (feedType === 'forYou' || feedType === 'trending') && (
                <FeaturedSeeds stories={stories} openStoryInOverlay={openStoryInOverlay} />
            )}

            {/* Trending Stories Section */}
            {!searchQuery.trim() && (
                <TrendingStoriesCarousel trendingStories={trendingStories} openStoryInOverlay={openStoryInOverlay} />
            )}

            {/* Featured Canons Section - ONLY in 'For You' or 'Trending' */}
            {!searchQuery.trim() && (feedType === 'forYou' || feedType === 'trending') && (
                <CanonRemixesCarousel stories={stories} openStoryInOverlay={openStoryInOverlay} />
            )}

            {/* People Results removed - use People tab instead */}

            {/* All Stories Header */}
            {!searchQuery.trim() && (
                <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-5 h-5 text-[#EC1D99]" />
                    <h2 className="text-lg font-bold">All Stories</h2>
                    {(feedType === 'seeds' || feedType === 'canon') && (
                        <button
                            onClick={() => setShowFeedInfo(true)}
                            className="ml-auto p-1.5 rounded-full bg-gray-800/50 hover:bg-gray-700 transition-colors"
                            aria-label="Learn more about this feed"
                        >
                            <Info className="w-4 h-4 text-gray-400" />
                        </button>
                    )}
                </div>
            )}

            {/* Feed Info Modal */}
            {showFeedInfo && (
                <FeedInfoModal feedType={feedType} onClose={() => setShowFeedInfo(false)} />
            )}

            {/* Stories Grid */}
            <div className="grid grid-cols-2 gap-3">
                {filteredStories.length > 0 ? (
                    <StoriesGrid stories={filteredStories} openStoryInOverlay={openStoryInOverlay} />
                ) : (
                    <EmptyStates
                        searchQuery={searchQuery}
                        feedType={feedType}
                        trendingStories={trendingStories}
                        openStoryInOverlay={openStoryInOverlay}
                        setShowFeedInfo={setShowFeedInfo}
                        setViewMode={setViewMode}
                    />
                )}
            </div>
        </div>
    );
}
