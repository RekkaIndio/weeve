'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import CreateStory, { CreateStoryFormState, Friend } from '@/app/components/CreateStory';
import { useStore, Story, User } from '@/lib/store';
import { supabase } from '@/lib/supabase';
import { getCollabPrice, formatPrice } from '@/lib/collaborations';


function CreateStoryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const groupId = searchParams?.get('groupId');
  const collaboratorId = searchParams?.get('collaboratorId');
  const isCollabMode = !!collaboratorId;

  const { addStory, currentUser, friends, deductTokens, fetchFriends, fetchStories } = useStore();
  const [groupInfo, setGroupInfo] = useState<{ name: string; avatar: string } | null>(null);

  // Collaboration mode state
  const [collaborator, setCollaborator] = useState<Friend | null>(null);
  const [collabPriceCents, setCollabPriceCents] = useState<number>(0);
  const [loadingCollab, setLoadingCollab] = useState(false);

  // Fetch group info if groupId is present
  useEffect(() => {
    if (groupId) {
      fetchGroupInfo();
    }
  }, [groupId]);

  // Fetch friends when user is available and on mount
  useEffect(() => {
    if (currentUser) {
      fetchFriends();
    }
  }, [fetchFriends, currentUser]);

  // Handle payment cancellation
  useEffect(() => {
    const paymentStatus = searchParams?.get('payment');
    if (paymentStatus === 'cancelled') {
      console.error('Payment was cancelled. Please try again.');
    }
  }, [searchParams]);

  // Fetch collaborator info if in collab mode
  useEffect(() => {
    if (!collaboratorId || !currentUser) return;

    setLoadingCollab(true);
    (async () => {
      try {
        // Fetch collaborator profile
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('user_id, name, avatar, is_influencer, collab_price_cents')
          .eq('user_id', collaboratorId)
          .single();

        if (error || !profile) {
          console.error('[CreateStory] Failed to fetch collaborator:', error);
          router.back();
          return;
        }

        setCollaborator({
          id: profile.user_id,
          name: profile.name,
          avatar: profile.avatar || undefined,
          isInfluencer: profile.is_influencer || false,
        });
        setCollabPriceCents(profile.collab_price_cents || 0);
      } catch (err) {
        console.error('[CreateStory] Error in collab mode setup:', err);
        router.back();
      } finally {
        setLoadingCollab(false);
      }
    })();
  }, [collaboratorId, currentUser, router]);

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

  const handleCreateStory = async (data: CreateStoryFormState): Promise<string> => {
    if (!currentUser) throw new Error('User not authenticated'); // Safety check

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

      // Build ordered participants and deduplicate while preserving order
      // Build final participants directly from ordered slots (preserve user slot positions)
      const orderedSlots = data.orderedParticipants || [];

      // Check if this is a public story (non-brand)
      const isBrandPost = data.postType === 'canon' || data.postType === 'seed';
      const isPublicStoryWithSlots = (data.visibility === 'public' || groupId) && !isBrandPost;

      // For public stories with slot selection, user has already chosen their slots explicitly
      // For other stories, ensure current user is in at least one slot
      let slotsWithUser = orderedSlots.slice();
      if (!isPublicStoryWithSlots && !slotsWithUser.some(s => s && s.id === currentUser.id)) {
        const firstEmpty = slotsWithUser.findIndex(s => s === null);
        if (firstEmpty !== -1) {
          slotsWithUser[firstEmpty] = { id: currentUser.id, name: currentUser.name, avatar: currentUser.avatar };
        } else {
          // No empty slots (rare), add the creator at the beginning
          slotsWithUser.unshift({ id: currentUser.id, name: currentUser.name, avatar: currentUser.avatar });
        }
      }

      // Build participants list from slot positions (allow duplicates)
      const finalParticipants = slotsWithUser.map((slot, idx) => slot ? ({
        ...mapToUser(slot),
        position: idx,
      }) : null).filter((p): p is User & { position: number } => p !== null);

      const computedMaxWeeves = Math.max(data.inviteCount + 1, slotsWithUser.length);

      // Check if this is a brand post requiring payment
      const requiresPayment = isBrandPost && data.visibilityDays;

      // Determine initial turn user based on story type
      // For all stories: first participant in slot order determines initial turn
      const initialTurnUserId = finalParticipants[0]?.id ?? currentUser.id;

      const { data: storyData, error: storyError } = await supabase
        .from('stories')
        .insert({
          title: data.title,
          description: description,
          creator_id: currentUser.id,
          // Use 'open' mode for brand posts AND public stories with slot selection (to handle open slots)
          // For collab mode, use 'invite' since it's between two specific creators
          mode: isCollabMode ? 'invite' : ((data.postType === 'canon' || data.postType === 'seed' || isPublicStoryWithSlots) ? 'open' : 'invite'),
          // Collab stories start as private until accepted, then go public when complete
          visibility: isCollabMode ? 'private' : data.visibility,
          status: 'active',
          max_weeves: computedMaxWeeves, // Store total slots including creator (inviteCount is friend count)
          current_turn_user_id: initialTurnUserId, // Set based on story type
          group_id: groupId || null,
          allow_comments: data.allowComments,
          hashtags: data.hashtags,
          turn_timer_hours: data.turnTimerHours || null,
          monetization_cost: data.monetizationCost || null,
          scheduled_for: data.scheduledFor || null,
          post_type: data.postType || 'normal',
          canon_slots: data.canonSlots || null,
          visibility_days: data.visibilityDays || null,
          // Set payment status for brand posts
          payment_status: requiresPayment ? 'pending' : 'completed',
          // Product URL for brand posts
          product_url: data.productUrl || null,
          // Collaboration fields
          is_collab: isCollabMode || null,
          collab_status: isCollabMode ? 'pending' : null,
          collab_initiator_id: isCollabMode ? currentUser.id : null,
          collab_target_id: isCollabMode ? collaboratorId : null,
          collab_price_cents: isCollabMode ? collabPriceCents : null,
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

      // Build participants list based on story type
      let participantsToInsert: { story_id: string; user_id: string; position: number; status: 'accepted' | 'waiting' }[];

      if (isPublicStoryWithSlots) {
        console.log('[CreateStory] Public Story Detected. Ordered Slots:', slotsWithUser);
        // For public stories: add ALL assigned participants (creator + friends)
        // Creator slots get 'accepted', friend slots get 'waiting' (they need to accept invite)
        // Empty/null slots are left open for public users to contribute
        participantsToInsert = slotsWithUser
          .map((slot, idx) => slot ? ({
            story_id: newStoryId,
            user_id: slot.id,
            position: idx,
            status: slot.id === currentUser.id ? ('accepted' as 'accepted') : ('waiting' as 'waiting'),
          }) : null)
          .filter((p): p is NonNullable<typeof p> => p !== null);
        console.log('[CreateStory] Inserted Participants (Public):', participantsToInsert);
      } else {
        console.log('[CreateStory] Standard/Brand Story Logic. Fallback participants:', finalParticipants);
        // For private stories and brand posts: use the original logic
        participantsToInsert = finalParticipants.map((participant) => ({
          story_id: newStoryId,
          user_id: participant.id,
          position: participant.position,
          status: participant.id === currentUser.id ? ('accepted' as 'accepted') : ('waiting' as 'waiting'),
        }));
      }

      // 2. Add Participants
      if (participantsToInsert.length > 0) {
        console.log('Adding participants:', participantsToInsert.length);
        let insertedParticipantsResult = await supabase
          .from('story_participants')
          .insert(participantsToInsert);

        if (insertedParticipantsResult.error) {
          const err = insertedParticipantsResult.error;
          console.error('Database error adding participants:', err);

          // If unique constraint prevented duplicate participants (older DB), try deduping
          const isDuplicateConstraint = typeof err.message === 'string' && err.message.includes('duplicate key value violates unique constraint');

          if (isDuplicateConstraint) {
            console.warn('[CreateStory] DB uniqueness constraint prevented duplicate participants. Trying to insert deduped participants as a fallback.');

            // Dedupe while preserving first occurrence and position
            const dedupMap = new Map<string, typeof participantsToInsert[0]>();
            participantsToInsert.forEach((p) => {
              if (!dedupMap.has(p.user_id)) {
                dedupMap.set(p.user_id, p);
              }
            });
            const deduped = Array.from(dedupMap.values());

            try {
              const { error: dedupError } = await supabase
                .from('story_participants')
                .insert(deduped);

              if (dedupError) {
                console.error('[CreateStory] Fallback dedup insert failed:', dedupError);
                // Rollback story creation to avoid partially created state
                try { await supabase.from('stories').delete().eq('id', newStoryId); } catch (delErr) { console.warn('Failed to rollback story creation:', delErr); }
                throw dedupError;
              }

              // Success: inform user that duplicates were removed due to DB constraints
              console.warn('[CreateStory] Story created but duplicate participants were removed due to DB constraints. To support duplicates, apply the migration supabase/migration_allow_duplicate_story_participants.sql');
              console.warn('Story created, but duplicate participants were removed due to DB constraints. Run supabase/migration_allow_duplicate_story_participants.sql to enable duplicates.');

              // Update DB maxWeeves for consistency
              try {
                if (computedMaxWeeves !== storyData.max_weeves) {
                  await supabase
                    .from('stories')
                    .update({ max_weeves: computedMaxWeeves })
                    .eq('id', newStoryId);
                }
              } catch (updateError) {
                console.warn('Failed to update story max_weeves for consistency:', updateError);
              }

              // Update local participants list to the deduped subset
              // Build new participant list for local store update
              const actualParticipantsForStore = finalParticipants.filter(p => dedupMap.has(p.id));
              const newStoryForStore: Story = {
                id: newStoryId,
                title: data.title,
                description: description,
                creatorId: currentUser.id,
                visibility: data.visibility,
                status: 'active',
                currentTurnUserId: actualParticipantsForStore[0]?.id ?? currentUser.id,
                contributions: [],
                participants: actualParticipantsForStore.map((p, index) => ({ ...p, position: p.position, status: p.id === currentUser.id ? 'accepted' as 'accepted' : 'waiting' as 'waiting' })),

                maxWeeves: computedMaxWeeves,
                groupId: groupId || undefined,
                groupAvatar: groupInfo?.avatar,
                hashtags: data.hashtags,
                likes: 0,
                likedBy: [],
                comments: [],
                allowComments: data.allowComments,
                mode: (data.postType === 'canon' || data.postType === 'seed') ? 'open' : 'invite',
                monetizationCost: data.monetizationCost,
                turnTimerHours: storyData.turn_timer_hours ?? (data.turnTimerHours ?? undefined),
                created_at: storyData.created_at,
                updated_at: storyData.updated_at,
              };

              addStory(newStoryForStore);

            } catch (fallbackErr) {
              console.error('[CreateStory] Fallback insert or rollback failed:', fallbackErr);
              const errorMessage = (fallbackErr && (fallbackErr as any).message) || 'Failed to add participants to the story.';
              console.error(errorMessage);
              // Rethrow to be caught by outer try/catch
              throw fallbackErr;
            }

            // Continue - we've handled participants insertion via fallback
          } else {
            // Regular error, rethrow
            throw err;
          }
        } else {
          // No error on initial insert

          // Ensure DB max_weeves is consistent with computed value
          try {
            if (computedMaxWeeves !== storyData.max_weeves) {
              await supabase
                .from('stories')
                .update({ max_weeves: computedMaxWeeves })
                .eq('id', newStoryId);
            }
          } catch (updateError) {
            console.warn('Failed to update story max_weeves for consistency:', updateError);
          }
        }

        // Send notifications based on story type
        if (isCollabMode && collaboratorId) {
          // Send collaboration request notification
          import('@/lib/notifications').then(({ notifyCollabRequest }) => {
            notifyCollabRequest(newStoryId, data.title, currentUser.id, collaboratorId, collabPriceCents || undefined).catch(err => {
              console.error('Failed to send collab request notification:', err);
            });
          }).catch(err => console.error('Failed to import notifications:', err));
        } else {
          // Send regular invite notifications to invited users (excluding creator)
          const invitedUserIds = finalParticipants
            .filter(p => p.id !== currentUser.id)
            .map(p => p.id);

          if (invitedUserIds.length > 0) {
            import('@/lib/notifications').then(({ notifyStoryInvite }) => {
              notifyStoryInvite(newStoryId, data.title, currentUser.name, invitedUserIds).catch(err => {
                console.error('Failed to send invite notifications:', err);
              });
            }).catch(err => console.error('Failed to import notifications:', err));
          }
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
        currentTurnUserId: finalParticipants[0]?.id ?? currentUser.id,
        contributions: [],
        participants: finalParticipants.map((p, index) => ({ ...p, position: index, status: p.id === currentUser.id ? 'accepted' as 'accepted' : 'waiting' as 'waiting' })),

        maxWeeves: computedMaxWeeves,
        groupId: groupId || undefined,
        groupAvatar: groupInfo?.avatar,
        hashtags: data.hashtags,
        likes: 0,
        likedBy: [],
        comments: [],
        allowComments: data.allowComments,
        mode: (data.postType === 'canon' || data.postType === 'seed') ? 'open' : 'invite',
        monetizationCost: data.monetizationCost,
        turnTimerHours: storyData.turn_timer_hours ?? (data.turnTimerHours ?? undefined),
        created_at: storyData.created_at,
        updated_at: storyData.updated_at,
        // Brand fields
        postType: data.postType || 'normal',
        canonSlots: data.canonSlots || undefined,
        scheduledFor: data.scheduledFor || undefined,
      };

      addStory(newStory);

      // Handle Group Notifications
      if (groupId && groupInfo) {
        // Fetch group members to notify
        const { data: groupMembers, error: membersError } = await supabase
          .from('group_members')
          .select('user_id')
          .eq('group_id', groupId)
          .eq('status', 'active')
          .neq('user_id', currentUser.id); // Exclude the creator

        if (!membersError && groupMembers && groupMembers.length > 0) {
          const memberIds = groupMembers.map((m: { user_id: string }) => m.user_id);

          import('@/lib/notifications').then(({ notifyGroupNewStory }) => {
            notifyGroupNewStory(
              groupId,
              groupInfo.name,
              newStoryId,
              data.title,
              currentUser.name,
              memberIds
            ).catch(err => {
              console.error('Failed to send group notifications:', err);
            });
          }).catch(err => console.error('Failed to import notifications:', err));
        }
      }

      // Ensure the server story list is up-to-date before routing so the story page can rely on fresh DB data

      try {
        await fetchStories();
      } catch (err) {
        console.warn('[CreateStory] fetchStories after create failed:', err);
      }

      console.log('Story created and added to store');

      // For brand posts requiring payment, return the ID without redirecting
      // The CreateStory component will handle the redirect to payment
      if (requiresPayment) {
        return newStoryId;
      }

      // For normal posts, redirect to the story
      router.push(`/story/${newStoryId}`);
      return newStoryId;

    } catch (error) {
      console.error('Error creating story:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create story. Please try again.';
      console.error(errorMessage);
      throw error; // Re-throw to let CreateStory component handle it
    }
  };

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-white">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  // Show loading state while fetching collaborator in collab mode
  if (isCollabMode && loadingCollab) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-white">
        <div className="text-gray-500">Setting up collaboration...</div>
      </div>
    );
  }

  // In collab mode, only show current user and collaborator as available friends
  const collabFriends: Friend[] = isCollabMode && collaborator && currentUser
    ? [
      { id: currentUser.id, name: currentUser.name, avatar: currentUser.avatar },
      collaborator
    ]
    : friends;

  return (
    <CreateStory
      onBack={handleBack}
      onCreateStory={handleCreateStory}
      currentUser={currentUser}
      availableFriends={collabFriends}
      onDeductTokens={deductTokens}
      groupId={groupId || undefined}
      groupName={groupInfo?.name}
      groupAvatar={groupInfo?.avatar}
      onRefreshFriends={async () => {
        await fetchFriends();
      }}
      isCollabMode={isCollabMode}
      collaborator={collaborator || undefined}
      collabPriceCents={collabPriceCents}
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
