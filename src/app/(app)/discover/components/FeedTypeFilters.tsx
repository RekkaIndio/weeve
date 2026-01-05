import { Sparkles, TrendingUp, Clock, Heart } from "lucide-react";

type FeedType = 'forYou' | 'trending' | 'new' | 'friends' | 'seeds' | 'canon';

interface FeedTypeFiltersProps {
    feedType: FeedType;
    setFeedType: (type: FeedType) => void;
}

export default function FeedTypeFilters({ feedType, setFeedType }: FeedTypeFiltersProps) {
    return (
        <div className="flex gap-2 pb-4 overflow-x-auto scrollbar-hide px-4">
            {[
                { id: 'forYou', label: 'For You', icon: Sparkles },
                { id: 'trending', label: 'Trending', icon: TrendingUp },
                { id: 'new', label: 'New', icon: Clock },
                { id: 'friends', label: 'Friends', icon: Heart },
                { id: 'seeds', label: '🌱 Seeds', icon: null },
                { id: 'canon', label: '🎬 Canon', icon: null },
            ].map(({ id, label, icon: Icon }) => (
                <button
                    key={id}
                    onClick={() => setFeedType(id as FeedType)}
                    className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${feedType === id
                        ? 'bg-[#EC1D99] text-white shadow-lg shadow-[#EC1D99]/30'
                        : 'bg-gray-900 text-gray-400 border border-gray-800 hover:border-gray-700 hover:text-white'
                        }`}
                >
                    {Icon && <Icon className="w-3.5 h-3.5" />}
                    {label}
                </button>
            ))}
        </div>
    );
}
