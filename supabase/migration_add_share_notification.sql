-- Add 'story_shared' to the allowed notification types
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE notifications ADD CONSTRAINT notifications_type_check CHECK (type IN (
  'friend_request',
  'friend_accepted',
  'story_invite',
  'story_turn',
  'story_completed',
  'story_liked',
  'story_commented',
  'story_participant_left',
  'group_invite',
  'group_update',
  'group_joined',
  'mention',
  'story_shared'
));
