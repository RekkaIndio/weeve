-- Add 'new_message' and ALL existing types to the notification type constraint
-- This allows storing message notifications and ALL OTHER notifications in the notifications table

-- First, drop the existing constraint
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Add updated constraint with ALL types found in codebase and migrations
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check CHECK (type IN (
    'friend_request',
    'friend_accepted',
    'story_invite',
    'story_turn',
    'story_completed',
    'story_liked',
    'story_commented',
    'story_participant_left',
    'story_shared',
    'group_invite',
    'group_update',
    'group_joined',
    'mention',
    'your_turn',
    'turn_skipped',
    'timer_warning',
    'timer_expired',
    'new_follower',
    'group_join_request',
    'group_request_approved',
    'group_request_declined',
    'content_approved',
    'content_rejected',
    'story_approved',
    'story_rejected',
    'content_submitted_for_review',
    'story_submitted_for_review',
    'story_comment',
    'share',
    'new_message'
));
