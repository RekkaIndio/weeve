-- Fix Friend Requests and Notifications Migration
-- Root cause: RLS policies were blocking INSERT operations even though they showed
-- WITH CHECK (true) - the actual issue is complex interaction between policies.
-- 
-- Solution: Re-create all policies with explicit permissive rules.

-- ============================================
-- STEP 1: Re-enable RLS (it was disabled for testing)
-- ============================================
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE friend_requests ENABLE ROW LEVEL SECURITY;

-- ============================================
-- NOTIFICATIONS TABLE - Fix All Policies
-- ============================================

-- Drop all existing notification policies (clean up old ones)
DROP POLICY IF EXISTS "Anyone can create notifications" ON notifications;
DROP POLICY IF EXISTS "System can create notifications" ON notifications;
DROP POLICY IF EXISTS "Authenticated users can create notifications" ON notifications;
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can delete their own notifications" ON notifications;

-- Drop new policies if they already exist (to allow re-running this migration)
DROP POLICY IF EXISTS "notifications_select_own" ON notifications;
DROP POLICY IF EXISTS "notifications_insert_authenticated" ON notifications;
DROP POLICY IF EXISTS "notifications_update_own" ON notifications;
DROP POLICY IF EXISTS "notifications_delete_own" ON notifications;

-- SELECT: Users can only view their own notifications
CREATE POLICY "notifications_select_own" ON notifications
  FOR SELECT USING (user_id = auth.uid()::text);

-- INSERT: Any authenticated user can create notifications (for any recipient)
CREATE POLICY "notifications_insert_authenticated" ON notifications
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- UPDATE: Users can only update their own notifications (mark as read)
CREATE POLICY "notifications_update_own" ON notifications
  FOR UPDATE USING (user_id = auth.uid()::text);

-- DELETE: Users can only delete their own notifications
CREATE POLICY "notifications_delete_own" ON notifications
  FOR DELETE USING (user_id = auth.uid()::text);

-- ============================================
-- FRIEND_REQUESTS TABLE - Fix All Policies
-- ============================================

-- Drop all existing friend_requests policies
DROP POLICY IF EXISTS "Users can view their friend requests" ON friend_requests;
DROP POLICY IF EXISTS "Users can create friend requests" ON friend_requests;
DROP POLICY IF EXISTS "Users can update received requests" ON friend_requests;
DROP POLICY IF EXISTS "Users can delete their friend requests" ON friend_requests;

-- Drop new policies if they already exist
DROP POLICY IF EXISTS "friend_requests_select_involved" ON friend_requests;
DROP POLICY IF EXISTS "friend_requests_insert_as_sender" ON friend_requests;
DROP POLICY IF EXISTS "friend_requests_update_received" ON friend_requests;
DROP POLICY IF EXISTS "friend_requests_delete_involved" ON friend_requests;

-- SELECT: Users can view requests they sent OR received
CREATE POLICY "friend_requests_select_involved" ON friend_requests
  FOR SELECT USING (sender_id = auth.uid()::text OR receiver_id = auth.uid()::text);

-- INSERT: Authenticated users can create friend requests (where they are sender)
CREATE POLICY "friend_requests_insert_as_sender" ON friend_requests
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND sender_id = auth.uid()::text);

-- UPDATE: Users can update requests they RECEIVED (to accept/decline)
CREATE POLICY "friend_requests_update_received" ON friend_requests
  FOR UPDATE USING (receiver_id = auth.uid()::text);

-- DELETE: Users can delete requests they are involved in
CREATE POLICY "friend_requests_delete_involved" ON friend_requests
  FOR DELETE USING (sender_id = auth.uid()::text OR receiver_id = auth.uid()::text);

-- ============================================
-- FRIENDSHIPS TABLE - Fix Insert Policy for Bidirectional
-- ============================================

DROP POLICY IF EXISTS "Users can create friendships" ON friendships;
DROP POLICY IF EXISTS "Users can delete their friendships" ON friendships;

-- DROP new policies if they exist
DROP POLICY IF EXISTS "friendships_insert_with_check" ON friendships;
DROP POLICY IF EXISTS "friendships_delete_own" ON friendships;

-- INSERT: Allow inserting if:
-- 1. It's my own friendship (user_id = me)
-- 2. OR it's the reverse friendship (friend_id = me) AND there is a matching accepted request
CREATE POLICY "friendships_insert_with_check" ON friendships
  FOR INSERT WITH CHECK (
    -- Case 1: I am adding a friend (standard)
    user_id = auth.uid()::text
    OR
    -- Case 2: The system/trigger is adding me as a friend to someone else
    (
      friend_id = auth.uid()::text AND
      EXISTS (
        SELECT 1 FROM friend_requests 
        WHERE sender_id = friendships.user_id 
        AND receiver_id = friendships.friend_id 
        AND status = 'accepted'
      )
    )
  );

-- DELETE: Users can delete their friendships
CREATE POLICY "friendships_delete_own" ON friendships
  FOR DELETE USING (user_id = auth.uid()::text);

-- ============================================
-- NOTIFICATIONS - Fix Type CHECK Constraint  
-- ============================================
-- The constraint was missing several notification types used in notifications.ts

ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check CHECK (type IN (
  'friend_request',
  'friend_accepted',
  'new_follower',
  'story_invite',
  'story_turn',
  'story_completed',
  'story_liked',
  'story_commented',
  'story_comment',
  'story_participant_left',
  'story_shared',
  'your_turn',
  'turn_skipped',
  'timer_warning',
  'timer_expired',
  'group_invite',
  'group_update',
  'group_joined',
  'group_join_request',
  'group_request_approved',
  'group_request_declined',
  'mention',
  'new_message',
  'content_submitted_for_review',
  'content_approved',
  'content_rejected',
  'story_submitted_for_review',
  'story_approved',
  'story_rejected',
  'share'
));

-- ============================================
-- DONE
-- ============================================

