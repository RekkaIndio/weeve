"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft, MoreVertical, Edit2, LogOut, Trash, GitBranch } from "lucide-react";
import { type Story, type User } from "@/lib/store";

interface StoryHeaderProps {
    story: Story;
    currentUser: User | null;
    showMenu: boolean;
    setShowMenu: (show: boolean) => void;
    onEdit?: () => void;
    onLeave?: () => void;
    onDelete?: () => void;
    isUserParticipant: boolean;
    originalStoryTitle?: string | null;
    pointerEventsAuto?: boolean;
}

export function StoryHeader({
    story,
    currentUser,
    showMenu,
    setShowMenu,
    onEdit,
    onLeave,
    onDelete,
    isUserParticipant,
    originalStoryTitle,
    pointerEventsAuto = false
}: StoryHeaderProps) {
    const router = useRouter();

    return (
        <div className="absolute top-0 left-0 right-0 z-20 p-4 flex items-center justify-between bg-gradient-to-b from-black/90 via-black/50 to-transparent pointer-events-none">
            <button
                onClick={() => router.back()}
                className={`p-2 rounded-full glass hover:bg-white/10 transition-colors ${pointerEventsAuto ? 'pointer-events-auto' : 'pointer-events-auto'}`}
            >
                <ChevronLeft className="w-6 h-6" />
            </button>
            <div className="flex flex-col items-center">
                <h1 className="font-bold text-sm tracking-wide uppercase opacity-80 font-sans">Weeve Timeline</h1>
                {story?.title && <div className="text-sm text-gray-300 mt-1 font-semibold">{story.title}</div>}

                {/* Weeve of indicator for forked stories */}
                {story.forkedFromStoryId && (
                    <button
                        onClick={() => router.push(`/story/${story.forkedFromStoryId}`)}
                        className="flex items-center gap-1.5 mt-1 px-2 py-0.5 rounded-full bg-[#EC1D99]/20 hover:bg-[#EC1D99]/30 transition-colors pointer-events-auto"
                    >
                        <GitBranch className="w-3 h-3 text-[#EC1D99]" />
                        <span className="text-[10px] font-medium text-gray-300">Weeve of:</span>
                        <span className="text-[10px] font-medium text-[#EC1D99] truncate max-w-[100px]">
                            {originalStoryTitle || 'Original'}
                        </span>
                    </button>
                )}
                {story.groupId && (
                    <button
                        onClick={() => router.push(`/groups/${story.groupId}`)}
                        className="flex items-center gap-1.5 mt-1 px-2 py-0.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors pointer-events-auto"
                    >
                        {story.groupAvatar && (
                            <img
                                src={story.groupAvatar}
                                alt="Group"
                                className="w-3 h-3 rounded-full"
                            />
                        )}
                        <span className="text-[10px] font-medium text-gray-300">{story.groupName || 'From Group'}</span>
                    </button>
                )}
            </div>
            <div className="relative pointer-events-auto">
                <button
                    onClick={() => setShowMenu(!showMenu)}
                    className="p-2 rounded-full glass hover:bg-white/10 transition-colors"
                >
                    <MoreVertical className="w-6 h-6" />
                </button>

                {/* Dropdown Menu */}
                {showMenu && (
                    <div className="absolute top-full right-0 mt-2 w-48 bg-gray-900 border border-gray-800 rounded-xl shadow-xl overflow-hidden z-50">
                        {story.creatorId === currentUser?.id && (
                            <>
                                {onEdit && (
                                    <button
                                        onClick={() => {
                                            onEdit();
                                            setShowMenu(false);
                                        }}
                                        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-800 transition-colors"
                                    >
                                        <Edit2 className="w-4 h-4 text-gray-400" />
                                        <span className="text-sm font-medium text-white">Edit Story</span>
                                    </button>
                                )}
                                {onDelete && (
                                    <button
                                        onClick={() => {
                                            onDelete();
                                            setShowMenu(false);
                                        }}
                                        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-800 transition-colors border-t border-gray-800"
                                    >
                                        <Trash className="w-4 h-4 text-red-400" />
                                        <span className="text-sm font-medium text-red-400">Delete Story</span>
                                    </button>
                                )}
                            </>
                        )}
                        {isUserParticipant && onLeave && (
                            <button
                                onClick={() => {
                                    onLeave();
                                    setShowMenu(false);
                                }}
                                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-800 transition-colors border-t border-gray-800"
                            >
                                <LogOut className="w-4 h-4 text-red-400" />
                                <span className="text-sm font-medium text-red-400">Leave Story</span>
                            </button>
                        )}
                        {story.forkedFromStoryId && (
                            <button
                                onClick={() => {
                                    router.push(`/story/${story.forkedFromStoryId}`);
                                    setShowMenu(false);
                                }}
                                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-800 transition-colors border-t border-gray-800"
                            >
                                <GitBranch className="w-4 h-4 text-[#EC1D99]" />
                                <span className="text-sm font-medium text-white">View Original Weeve</span>
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
