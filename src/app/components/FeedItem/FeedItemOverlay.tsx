import { GitBranch } from "lucide-react";
import { useRouter } from "next/navigation";
import { Story } from "@/lib/store";

interface FeedItemOverlayProps {
    story: Story;
    originalStoryTitle: string | null;
}

export default function FeedItemOverlay({ story, originalStoryTitle }: FeedItemOverlayProps) {
    const router = useRouter();

    if (!story.forkedFromStoryId) return null;

    return (
        <div className="absolute top-0 left-0 right-0 z-20 flex justify-center pt-[calc(env(safe-area-inset-top)+1rem)] pointer-events-none">
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/story/${story.forkedFromStoryId}`);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-black/40 backdrop-blur-md rounded-full text-xs text-gray-200 hover:bg-black/60 hover:text-white transition-all border border-white/10 pointer-events-auto shadow-lg"
            >
                <GitBranch className="w-3 h-3 text-[#EC1D99]" />
                <span className="opacity-80">Weeve of</span>
                <span className="font-bold text-white max-w-[150px] truncate">
                    {originalStoryTitle || 'Original'}
                </span>
            </button>
        </div>
    );
}
