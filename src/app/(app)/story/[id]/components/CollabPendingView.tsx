"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft, Sparkles, Loader2 } from "lucide-react";
import { type Story, type User } from "@/lib/store";

interface CollabPendingViewProps {
    story: Story;
    currentUser: User;
    isCollabTarget: boolean;
    isCollabInitiator: boolean;
    fetchStories: () => Promise<void>;
}

export function CollabPendingView({
    story,
    currentUser,
    isCollabTarget,
    isCollabInitiator,
    fetchStories,
}: CollabPendingViewProps) {
    const router = useRouter();

    return (
        <div className="min-h-screen bg-black text-white flex flex-col">
            {/* Header */}
            <header className="sticky top-0 z-20 bg-black/90 backdrop-blur-md border-b border-gray-800 px-4 py-4 pt-[calc(env(safe-area-inset-top,0px)+1rem)]">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => router.back()}
                        className="p-2 rounded-full border border-gray-700 hover:bg-gray-900 transition-colors"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold">Collaboration Request</h1>
                        <p className="text-xs text-gray-400">{story.title}</p>
                    </div>
                </div>
            </header>

            <main className="flex-1 px-4 py-6 max-w-xl mx-auto w-full">
                {/* Collaboration Info Card */}
                <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-3xl p-6 border border-purple-500/30 mb-6">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 flex items-center justify-center">
                            <Sparkles className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold">Creator Collaboration</h2>
                            <p className="text-sm text-gray-400">
                                {isCollabTarget ? 'Someone wants to collaborate with you!' : 'Waiting for response...'}
                            </p>
                        </div>
                    </div>

                    {story.collabPriceCents && story.collabPriceCents > 0 && (
                        <div className="bg-black/30 rounded-xl p-3 mb-4">
                            <p className="text-sm text-gray-300">
                                <span className="text-green-400 font-semibold">${(story.collabPriceCents / 100).toFixed(2)}</span>
                                {isCollabTarget ? ' paid for this collaboration' : ' paid'}
                            </p>
                        </div>
                    )}

                    <p className="text-sm text-gray-300 mb-4">{story.description}</p>

                    {/* Slot Preview */}
                    <div className="bg-black/30 rounded-xl p-4">
                        <h3 className="text-sm font-semibold text-gray-400 mb-3">Arrangement</h3>
                        <div className="flex gap-2">
                            {story.participants.sort((a, b) => (a.position || 0) - (b.position || 0)).map((p, idx) => (
                                <div key={p.id + '-' + idx} className="flex-1 text-center">
                                    <div className="w-12 h-12 mx-auto rounded-full bg-gray-800 border-2 border-gray-700 flex items-center justify-center overflow-hidden">
                                        {p.avatar ? (
                                            <img src={p.avatar} alt={p.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-xl">{p.name.charAt(0)}</span>
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-400 mt-1 truncate">{p.name}</p>
                                    <p className="text-xs text-purple-400">Slot {idx + 1}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                {isCollabTarget && (
                    <div className="space-y-3">
                        <button
                            onClick={async () => {
                                const { acceptCollabRequest } = await import('@/lib/collaborations');
                                const result = await acceptCollabRequest(story.id, currentUser.id);
                                if (result.success) {
                                    await fetchStories();
                                }
                            }}
                            className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl font-bold text-lg hover:opacity-90 transition-opacity"
                        >
                            Accept Collaboration
                        </button>
                        <button
                            onClick={async () => {
                                const { declineCollabRequest } = await import('@/lib/collaborations');
                                const result = await declineCollabRequest(story.id, currentUser.id);
                                if (result.success) {
                                    router.push('/profile');
                                }
                            }}
                            className="w-full py-4 bg-gray-800 rounded-2xl font-bold text-lg text-gray-300 hover:bg-gray-700 transition-colors"
                        >
                            Decline
                        </button>
                        {story.collabPriceCents && story.collabPriceCents > 0 && (
                            <p className="text-xs text-center text-gray-500">
                                Declining will refund ${(story.collabPriceCents / 100).toFixed(2)} to the requester
                            </p>
                        )}
                    </div>
                )}

                {isCollabInitiator && (
                    <div className="text-center space-y-4">
                        <div className="bg-gray-800/50 rounded-2xl p-6">
                            <Loader2 className="w-8 h-8 mx-auto mb-3 animate-spin text-purple-400" />
                            <p className="text-gray-400">Waiting for response...</p>
                            <p className="text-sm text-gray-500 mt-2">
                                You'll be notified when they accept or decline
                            </p>
                        </div>
                        <button
                            onClick={async () => {
                                const { cancelCollabRequest } = await import('@/lib/collaborations');
                                const result = await cancelCollabRequest(story.id, currentUser.id);
                                if (result.success) {
                                    router.push('/profile');
                                }
                            }}
                            className="text-gray-400 hover:text-white transition-colors"
                        >
                            Cancel Request
                        </button>
                    </div>
                )}
            </main>
        </div>
    );
}
