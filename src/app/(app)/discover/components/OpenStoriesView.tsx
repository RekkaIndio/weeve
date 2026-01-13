import { Story } from "@/lib/store";
import { Sparkles, Info } from "lucide-react";
import StoriesGrid from "./StoriesGrid";
import { useState } from "react";

interface OpenStoriesViewProps {
    stories: Story[];
    openStoryInOverlay: (id: string) => void;
    searchQuery: string;
}

export default function OpenStoriesView({
    stories,
    openStoryInOverlay,
    searchQuery
}: OpenStoriesViewProps) {
    const [showInfo, setShowInfo] = useState(false);

    return (
        <div className="space-y-6 px-4">
            {/* Header */}
            {!searchQuery.trim() && (
                <div className="flex flex-col gap-2 mb-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-[#EC1D99]" />
                            <h2 className="text-lg font-bold">Open for Collaboration</h2>
                        </div>
                        <button
                            onClick={() => setShowInfo(!showInfo)}
                            className="p-1.5 rounded-full bg-gray-800/50 hover:bg-gray-700 transition-colors"
                        >
                            <Info className="w-4 h-4 text-gray-400" />
                        </button>
                    </div>

                    {showInfo && (
                        <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-3 text-sm text-gray-300">
                            <p>These stories are open for contributions! We've ordered them based on your interests so you can find the perfect story to join.</p>
                        </div>
                    )}
                </div>
            )}

            {/* Stories Grid */}
            {stories.length > 0 ? (
                <StoriesGrid stories={stories} openStoryInOverlay={openStoryInOverlay} />
            ) : (
                <div className="py-20 text-center text-gray-400">
                    <p>No open stories found matching your criteria.</p>
                </div>
            )}
        </div>
    );
}
