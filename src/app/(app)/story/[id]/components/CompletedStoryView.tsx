"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import FeedItem from "@/app/components/FeedItem";
import EditStoryModal from "@/app/components/EditStoryModal";
import { type Story, type User, type Contribution } from "@/lib/store";
import { leaveStory, deleteStory } from "@/lib/stories";
import { StoryHeader } from "./StoryHeader";
import { ConfirmModal } from "./Modals";

interface CompletedStoryViewProps {
    story: Story;
    currentUser: User | null;
    contributions: Contribution[];
    isUserParticipant: boolean;
    originalStoryTitle: string | null | undefined;
}

export function CompletedStoryView({
    story,
    currentUser,
    contributions,
    isUserParticipant,
    originalStoryTitle,
}: CompletedStoryViewProps) {
    const router = useRouter();

    const [showMenu, setShowMenu] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // Handle leaving the story
    const handleLeaveStory = async () => {
        if (!currentUser) return;
        setShowLeaveConfirm(false);
        setShowMenu(false);

        try {
            const result = await leaveStory(story.id, currentUser.id, currentUser.name);

            if (result.success) {
                router.push('/profile');
            } else {
                console.error(result.error || 'Failed to leave story');
            }
        } catch (error) {
            console.error('Error leaving story:', error);
        }
    };

    // Handle deleting the story (creators only)
    const handleDeleteStory = async () => {
        if (!currentUser) return;
        setShowDeleteConfirm(false);
        setShowMenu(false);

        try {
            const result = await deleteStory(story.id, currentUser.id);

            if (result.success) {
                if (story.groupId) {
                    router.push(`/groups/${story.groupId}`);
                } else {
                    router.push('/profile');
                }
            } else {
                console.error(result.error || 'Failed to delete story');
            }
        } catch (error) {
            console.error('Error deleting story:', error);
        }
    };

    // Choose initial contribution to match the profile thumbnail if possible
    const initialContributionId = useMemo(() => {
        if (!contributions || contributions.length === 0) return undefined;

        const exact = contributions.find(c => c.mediaUrl === story.coverImage);
        if (exact) return exact.id;

        const substring = contributions.find(c =>
            c.mediaUrl && story.coverImage &&
            (c.mediaUrl.includes(story.coverImage) ||
                (story.coverImage.includes && story.coverImage.includes(c.mediaUrl)))
        );
        if (substring) return substring.id;

        return contributions[0]?.id;
    }, [contributions, story.coverImage]);

    return (
        <div className="h-full flex flex-col bg-black text-white relative">
            {/* Header */}
            <StoryHeader
                story={story}
                currentUser={currentUser}
                showMenu={showMenu}
                setShowMenu={setShowMenu}
                onEdit={() => setShowEditModal(true)}
                onLeave={() => setShowLeaveConfirm(true)}
                onDelete={() => setShowDeleteConfirm(true)}
                isUserParticipant={isUserParticipant}
                originalStoryTitle={originalStoryTitle}
                pointerEventsAuto={true}
            />

            {/* FeedItem renders the feed-style post UI */}
            <div className="flex-1">
                <FeedItem
                    story={story}
                    initialContributionId={initialContributionId}
                />
            </div>

            {/* Edit Story Modal */}
            {showEditModal && (
                <EditStoryModal
                    story={story}
                    onClose={() => setShowEditModal(false)}
                />
            )}

            {/* Leave Story Confirmation Modal */}
            <ConfirmModal
                isOpen={showLeaveConfirm}
                onClose={() => setShowLeaveConfirm(false)}
                onConfirm={handleLeaveStory}
                title="Leave Story?"
                message={
                    <>
                        Are you sure you want to leave &quot;<span className="text-white font-medium">{story.title}</span>&quot;? This will free up your slot for someone else.
                    </>
                }
                confirmLabel="Yes, Leave"
                variant="danger"
            />

            {/* Delete Story Confirmation Modal */}
            <ConfirmModal
                isOpen={showDeleteConfirm}
                onClose={() => setShowDeleteConfirm(false)}
                onConfirm={handleDeleteStory}
                title="Delete Story?"
                message={
                    <>
                        Are you sure you want to permanently delete &quot;<span className="text-white font-medium">{story.title}</span>&quot;? This action cannot be undone and will remove all contributions, comments, and likes.
                    </>
                }
                confirmLabel="Yes, Delete"
                variant="danger"
            />
        </div>
    );
}
