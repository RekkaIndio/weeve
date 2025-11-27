'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import CreateStory, { CreateStoryFormState, Friend } from '@/app/components/CreateStory';
import { useStore, Story, User } from '@/lib/store';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';


function CreateStoryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const groupId = searchParams?.get('groupId');
  const { addStory, currentUser, friends, deductTokens, fetchFriends } = useStore();
  const [groupInfo, setGroupInfo] = useState<{ name: string; avatar: string } | null>(null);

  // Fetch group info if groupId is present
  useEffect(() => {
    if (groupId) {
      fetchGroupInfo();
    }
  }, [groupId]);

  // Fetch friends on mount
  useEffect(() => {
    fetchFriends();
  }, [fetchFriends]);

  const fetchGroupInfo = async () => {
    if (!groupId) return;
    try {
      const { data, error } = await supabase
        .from('groups')
        .select('name, avatar')
        .eq('id', groupId)
        .single();

      if (error) throw error;
      setGroupInfo(data);
    } catch (error) {
      console.error('Error fetching group info:', error);
    }
  };

  const handleBack = () => {
    router.back();
  };

  const mapToUser = (participant: Friend): User => {
    if (participant.id === currentUser?.id && currentUser) {
      return {
        id: currentUser.id,
        name: currentUser.name,
        avatar: currentUser.avatar,
        tokens: currentUser.tokens,
        isInfluencer: currentUser.isInfluencer,
        interactionCost: currentUser.interactionCost,
        inviteCode: currentUser.inviteCode,
      };
    }

    const existingFriend = friends.find((friend) => friend.id === participant.id);

    return {
      id: participant.id,
      name: participant.name,
      avatar: participant.avatar,
      tokens: existingFriend?.tokens ?? 0,
      isInfluencer: participant.isInfluencer,
      interactionCost: participant.interactionCost,
    };
  };

  const handleCreateStory = async (data: CreateStoryFormState) => {
    if (!currentUser) return; // Safety check

    try {
      // Ensure description is never empty (database requires NOT NULL)
      const description = data.description.trim() || 'No description provided';

      console.log('Creating story with data:', {
        title: data.title,
        description,
        creator_id: currentUser.id,
        visibility: data.visibility,
        inviteCount: data.inviteCount,
      });

      // 1. Create Story in Supabase
      const { data: storyData, error: storyError } = await supabase
        .from('stories')
        .insert({
          title: data.title,
          description: description,
          creator_id: currentUser.id,
          mode: 'invite', // Defaulting to invite mode for now based on UI
          visibility: data.visibility, // Assuming DB has visibility column or we map it
          status: 'active',
          max_weeves: data.inviteCount, // Using inviteCount as max_weeves/participants
          current_turn_user_id: currentUser.id, // Creator starts? Or first in list?
          group_id: groupId || null,
          allow_comments: data.allowComments,
          allow_reuse: data.allowReuse,
          hashtags: data.hashtags,
          turn_timer_hours: data.turnTimerHours || null,
        })
        .select()
        .single();

      if (storyError) {
        console.error('Database error creating story:', storyError);
        throw storyError;
      }
      if (!storyData) throw new Error('Failed to create story');

      console.log('Story created successfully:', storyData.id);

      const newStoryId = storyData.id;
      const participantList = (data.orderedParticipants || [])
        .filter((participant): participant is Friend => participant !== null)
        .map(mapToUser);

      const uniqueParticipants: User[] = [];
      const seenParticipantIds = new Set<string>();

      for (const participant of participantList) {
        if (!seenParticipantIds.has(participant.id)) {
          uniqueParticipants.push(participant);
          seenParticipantIds.add(participant.id);
        }
      }

      let creatorParticipant = uniqueParticipants.find((participant) => participant.id === currentUser.id);

      if (!creatorParticipant) {
        creatorParticipant = mapToUser({ id: currentUser.id, name: currentUser.name, avatar: currentUser.avatar });
      }

      const finalParticipants = [creatorParticipant, ...uniqueParticipants.filter((participant) => participant.id !== currentUser.id)];

      const participantsToInsert = finalParticipants.map((participant, index) => ({
        story_id: newStoryId,
        user_id: participant.id,
        position: index,
      }));

      // 2. Add Participants
      if (participantsToInsert.length > 0) {
        console.log('Adding participants:', participantsToInsert.length);
        const { error: participantsError } = await supabase
          .from('story_participants')
          .insert(participantsToInsert);

        if (participantsError) {
          console.error('Database error adding participants:', participantsError);
          throw participantsError;
        }
      }

      // 3. Update Local Store for immediate feedback
      const newStory: Story = {
        id: newStoryId,
        title: data.title,
        description: description,
        creatorId: currentUser.id,
        visibility: data.visibility,
        status: 'active',
        currentTurnUserId: currentUser.id,
        contributions: [],
        participants: finalParticipants,
        maxWeeves: data.inviteCount,
        groupId: groupId || undefined,
        groupAvatar: groupInfo?.avatar,
        hashtags: data.hashtags,
        likes: 0,
        likedBy: [],
        comments: [],
        mode: 'invite',
      };

      addStory(newStory);

      console.log('Story created and added to store, redirecting...');
      // Redirect to the new story
      router.push(`/story/${newStoryId}`);

    } catch (error) {
      console.error('Error creating story:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create story. Please try again.';
      toast.error(errorMessage);
      alert('Failed to create story. Please try again.');
    }
  };

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-white">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <CreateStory
      onBack={handleBack}
      onCreateStory={handleCreateStory}
      currentUser={currentUser}
      availableFriends={friends}
      onDeductTokens={deductTokens}
      groupId={groupId || undefined}
      groupName={groupInfo?.name}
      groupAvatar={groupInfo?.avatar}
    />
  );
}

export default function CreateStoryPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen bg-black text-white">Loading...</div>}>
      <CreateStoryContent />
    </Suspense>
  );
}
