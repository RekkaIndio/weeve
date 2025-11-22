'use client';

import { Suspense } from 'react';

import { useRouter } from 'next/navigation';
import CreateStory, { CreateStoryFormState, Friend } from '@/app/components/CreateStory';
import { useStore, Story, User } from '@/lib/store';



export default function CreateStoryPage() {
  const router = useRouter();
  const { addStory, currentUser, friends, deductTokens } = useStore();

  const handleBack = () => {
    router.back();
  };

  const handleCreateStory = async (data: CreateStoryFormState) => {
    // Create new story object
    const newStory: Story = {
      id: Math.random().toString(36).substr(2, 9),
      title: data.title,
      description: data.description,
      creatorId: currentUser.id,
      visibility: data.visibility,
      status: 'active',
      // Use the ordered participants from the form
      participants: data.orderedParticipants
        ?.filter((p): p is Friend => p !== null)
        .map(p => ({
          id: p.id,
          name: p.name,
          avatar: p.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.name}`,
          tokens: 0
        })) || [currentUser],
      contributions: [],

      // Set turn to the first participant in the ordered list
      currentTurnUserId: data.orderedParticipants
        ? data.orderedParticipants.find(p => p !== null)?.id || currentUser.id
        : currentUser.id,
    };

    // Add to store
    addStory(newStory);

    // Simulate network delay for effect
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Redirect to the new story
    router.push(`/story/${newStory.id}`);
  };

  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen bg-black text-white">Loading...</div>}>
      <CreateStory
        onBack={handleBack}
        onCreateStory={handleCreateStory}
        currentUser={currentUser}
        availableFriends={friends}
        onDeductTokens={deductTokens}
      />
    </Suspense>
  );
}
