-- Optimize RLS policies to prevent per-row evaluation of auth.uid()
-- Replaces auth.uid() with (select auth.uid()) in policy definitions

-- ============================================
-- NOTIFICATIONS TABLE
-- ============================================

DROP POLICY IF EXISTS "notifications_select_own" ON notifications;
DROP POLICY IF EXISTS "notifications_insert_authenticated" ON notifications;
DROP POLICY IF EXISTS "notifications_update_own" ON notifications;
DROP POLICY IF EXISTS "notifications_delete_own" ON notifications;

-- SELECT: Users can only view their own notifications
CREATE POLICY "notifications_select_own" ON notifications
  FOR SELECT USING (user_id = (select auth.uid())::text);

-- INSERT: Any authenticated user can create notifications (for any recipient)
CREATE POLICY "notifications_insert_authenticated" ON notifications
  FOR INSERT WITH CHECK ((select auth.uid()) IS NOT NULL);

-- UPDATE: Users can only update their own notifications (mark as read)
CREATE POLICY "notifications_update_own" ON notifications
  FOR UPDATE USING (user_id = (select auth.uid())::text);

-- DELETE: Users can only delete their own notifications
CREATE POLICY "notifications_delete_own" ON notifications
  FOR DELETE USING (user_id = (select auth.uid())::text);


-- ============================================
-- FRIEND_REQUESTS TABLE
-- ============================================

DROP POLICY IF EXISTS "friend_requests_select_involved" ON friend_requests;
DROP POLICY IF EXISTS "friend_requests_insert_as_sender" ON friend_requests;
DROP POLICY IF EXISTS "friend_requests_update_received" ON friend_requests;
DROP POLICY IF EXISTS "friend_requests_delete_involved" ON friend_requests;

-- SELECT: Users can view requests they sent OR received
CREATE POLICY "friend_requests_select_involved" ON friend_requests
  FOR SELECT USING (sender_id = (select auth.uid())::text OR receiver_id = (select auth.uid())::text);

-- INSERT: Authenticated users can create friend requests (where they are sender)
CREATE POLICY "friend_requests_insert_as_sender" ON friend_requests
  FOR INSERT WITH CHECK ((select auth.uid()) IS NOT NULL AND sender_id = (select auth.uid())::text);

-- UPDATE: Users can update requests they RECEIVED (to accept/decline)
CREATE POLICY "friend_requests_update_received" ON friend_requests
  FOR UPDATE USING (receiver_id = (select auth.uid())::text);

-- DELETE: Users can delete requests they are involved in
CREATE POLICY "friend_requests_delete_involved" ON friend_requests
  FOR DELETE USING (sender_id = (select auth.uid())::text OR receiver_id = (select auth.uid())::text);


-- ============================================
-- FRIENDSHIPS TABLE
-- ============================================

DROP POLICY IF EXISTS "friendships_insert_with_check" ON friendships;
DROP POLICY IF EXISTS "friendships_delete_own" ON friendships;

-- INSERT: Allow inserting if:
-- 1. It's my own friendship (user_id = me)
-- 2. OR it's the reverse friendship (friend_id = me) AND there is a matching accepted request
CREATE POLICY "friendships_insert_with_check" ON friendships
  FOR INSERT WITH CHECK (
    user_id = (select auth.uid())::text
    OR
    (
      friend_id = (select auth.uid())::text AND
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
  FOR DELETE USING (user_id = (select auth.uid())::text);
