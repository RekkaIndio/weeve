"use client";

import { use, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";

import { CollabPendingView } from "./components/CollabPendingView";
import { CompletedStoryView } from "./components/CompletedStoryView";
import { ActiveStoryView } from "./components/ActiveStoryView";
import { useStoryData } from "./hooks/useStoryData";
import { useStoryPermissions } from "./hooks/useStoryPermissions";

export default function StoryPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    return <StoryPageContent storyId={id} />;
}

function StoryPageContent({ storyId }: { storyId: string }) {
    const router = useRouter();
    const { fetchStories, stories, blockedUserIds } = useStore();
    const { story, isFetchingStory, hasFetchedOnce, contributions, timelineEntries } = useStoryData(storyId);
    const { currentUser } = useStore();

    const permissions = useStoryPermissions({
        story,
        currentUser,
        contributions,
        maxWeeves: story?.maxWeeves ?? null,
        contributionsCount: contributions.length
    });

    // Payment Logic
    useEffect(() => {
        const handlePaymentStatus = async () => {
            const urlParams = new URLSearchParams(window.location.search);
            const paymentStatus = urlParams.get('payment');

            if (!paymentStatus || !story) return;

            if (paymentStatus === 'success') {
                try {
                    const { error } = await supabase
                        .from('stories')
                        .update({ payment_status: 'completed', payment_completed_at: new Date().toISOString() })
                        .eq('id', storyId);

                    if (error) {
                        console.error('Error updating payment status:', error);
                    } else {
                        await fetchStories();
                    }
                } catch (err) {
                    console.error('Error processing payment success:', err);
                }
            }
        };
        handlePaymentStatus();
    }, [storyId, story, fetchStories]);

    // Handle initial loading
    if (isFetchingStory && !hasFetchedOnce) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-black text-white">
                <Loader2 className="w-8 h-8 animate-spin text-[#EC1D99]" />
            </div>
        );
    }

    if (!story) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-4 text-center">
                <p className="text-xl font-bold mb-4">Story not found</p>
                <p className="text-gray-400 mb-6">This story may have been deleted or you don&apos;t have permission to view it.</p>
                <button onClick={() => router.push('/feed')} className="px-6 py-3 bg-[#EC1D99] rounded-full font-bold hover:bg-[#D41C84] transition-colors">
                    Go to Feed
                </button>
            </div>
        );
    }

    // Blocked User Check
    if (blockedUserIds.includes(story.creatorId)) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-4 text-center">
                <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center mb-6">
                    <span className="text-2xl">🚫</span>
                </div>
                <p className="text-xl font-bold mb-4">Content Unavailable</p>
                <p className="text-gray-400 mb-6 font-medium">You cannot view content from this user.</p>
                <button onClick={() => router.push('/feed')} className="px-6 py-3 bg-white/10 rounded-full font-bold hover:bg-white/20 transition-colors">
                    Go to Feed
                </button>
            </div>
        );
    }

    // Determine original story title for forks
    const originalStoryTitle = stories.find(s => s.id === story.forkedFromStoryId)?.title ?? null;

    if (permissions.isCollabPending && currentUser) {
        return (
            <CollabPendingView
                story={story}
                currentUser={currentUser}
                isCollabTarget={permissions.isCollabTarget}
                isCollabInitiator={permissions.isCollabInitiator}
                fetchStories={fetchStories}
            />
        );
    }

    if (permissions.isStoryComplete) {
        return (
            <CompletedStoryView
                story={story}
                currentUser={currentUser}
                contributions={contributions}
                isUserParticipant={permissions.isUserParticipant}
                originalStoryTitle={originalStoryTitle}
            />
        );
    }

    return (
        <ActiveStoryView
            story={story}
            currentUser={currentUser}
            contributions={contributions}
            timelineEntries={timelineEntries}
            originalStoryTitle={originalStoryTitle ?? undefined}
            isUserParticipant={permissions.isUserParticipant}
            isMyTurn={permissions.isMyTurn}
        />
    );
}
