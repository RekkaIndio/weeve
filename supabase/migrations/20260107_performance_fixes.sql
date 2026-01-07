-- Performance Fixes Part 1: auth_rls_initplan
-- Wraps auth.uid(), auth.role(), auth.jwt() in subselects for better performance
-- This prevents re-evaluation of auth functions for each row

-- ============================================================================
-- BLOCKED_USERS
-- ============================================================================
DROP POLICY IF EXISTS "Users can view their own blocked users" ON blocked_users;
CREATE POLICY "Users can view their own blocked users" ON blocked_users
  FOR SELECT USING ((select auth.uid())::text = user_id);

DROP POLICY IF EXISTS "Users can block other users" ON blocked_users;
CREATE POLICY "Users can block other users" ON blocked_users
  FOR INSERT WITH CHECK ((select auth.uid())::text = user_id);

DROP POLICY IF EXISTS "Users can unblock users" ON blocked_users;
CREATE POLICY "Users can unblock users" ON blocked_users
  FOR DELETE USING ((select auth.uid())::text = user_id);


-- ============================================================================
-- NOTIFICATION_PREFERENCES
-- ============================================================================
DROP POLICY IF EXISTS "Users can view their own preferences" ON notification_preferences;
CREATE POLICY "Users can view their own preferences" ON notification_preferences
  FOR SELECT USING ((select auth.uid())::text = user_id);

DROP POLICY IF EXISTS "Users can update their own preferences" ON notification_preferences;
CREATE POLICY "Users can update their own preferences" ON notification_preferences
  FOR UPDATE USING ((select auth.uid())::text = user_id);

-- ============================================================================
-- SUPPORT_TICKETS
-- ============================================================================
DROP POLICY IF EXISTS "Users can view their own tickets" ON support_tickets;
CREATE POLICY "Users can view their own tickets" ON support_tickets
  FOR SELECT USING ((select auth.uid())::text = user_id);

DROP POLICY IF EXISTS "Users can create tickets" ON support_tickets;
CREATE POLICY "Users can create tickets" ON support_tickets
  FOR INSERT WITH CHECK ((select auth.uid())::text = user_id);

-- ============================================================================
-- CONVERSATIONS
-- ============================================================================
DROP POLICY IF EXISTS "conversations_select" ON conversations;
CREATE POLICY "conversations_select" ON conversations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_id = conversations.id
      AND user_id = (select auth.uid())::text
    )
  );

DROP POLICY IF EXISTS "conversations_insert" ON conversations;
CREATE POLICY "conversations_insert" ON conversations
  FOR INSERT WITH CHECK ((select auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "conversations_update" ON conversations;
CREATE POLICY "conversations_update" ON conversations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_id = conversations.id
      AND user_id = (select auth.uid())::text
    )
  );

-- ============================================================================
-- CONVERSATION_PARTICIPANTS
-- ============================================================================
DROP POLICY IF EXISTS "participants_select" ON conversation_participants;
CREATE POLICY "participants_select" ON conversation_participants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = conversation_participants.conversation_id
      AND cp.user_id = (select auth.uid())::text
    )
  );

DROP POLICY IF EXISTS "participants_insert" ON conversation_participants;
CREATE POLICY "participants_insert" ON conversation_participants
  FOR INSERT WITH CHECK ((select auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "participants_update" ON conversation_participants;
CREATE POLICY "participants_update" ON conversation_participants
  FOR UPDATE USING (user_id = (select auth.uid())::text);

-- ============================================================================
-- MESSAGES
-- ============================================================================
DROP POLICY IF EXISTS "messages_select" ON messages;
CREATE POLICY "messages_select" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_id = messages.conversation_id
      AND user_id = (select auth.uid())::text
    )
  );

DROP POLICY IF EXISTS "messages_insert" ON messages;
CREATE POLICY "messages_insert" ON messages
  FOR INSERT WITH CHECK (
    sender_id = (select auth.uid())::text AND
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_id = messages.conversation_id
      AND user_id = (select auth.uid())::text
    )
  );

-- ============================================================================
-- VERIFICATION_CRITERIA
-- ============================================================================
DROP POLICY IF EXISTS "Users can view their own verification criteria" ON verification_criteria;
CREATE POLICY "Users can view their own verification criteria" ON verification_criteria
  FOR SELECT USING ((select auth.uid())::text = user_id);

DROP POLICY IF EXISTS "Service role can manage verification criteria" ON verification_criteria;
CREATE POLICY "Service role can manage verification criteria" ON verification_criteria
  FOR ALL USING ((select auth.jwt()->>'role') = 'service_role');

-- ============================================================================
-- VERIFICATION_REQUIREMENTS (consolidate policies)
-- ============================================================================
DROP POLICY IF EXISTS "Anyone can view verification requirements" ON verification_requirements;
DROP POLICY IF EXISTS "Service role can manage requirements" ON verification_requirements;
CREATE POLICY "Public read, service role write" ON verification_requirements
  FOR SELECT USING (true);
CREATE POLICY "Service role manages requirements" ON verification_requirements
  FOR ALL USING ((select auth.jwt()->>'role') = 'service_role');

-- ============================================================================
-- VERIFICATION_AUDIT_LOG
-- ============================================================================
DROP POLICY IF EXISTS "Users can view their own verification audit log" ON verification_audit_log;
CREATE POLICY "Users can view their own verification audit log" ON verification_audit_log
  FOR SELECT USING ((select auth.uid())::text = user_id);

DROP POLICY IF EXISTS "Service role can manage audit log" ON verification_audit_log;
CREATE POLICY "Service role can manage audit log" ON verification_audit_log
  FOR ALL USING ((select auth.jwt()->>'role') = 'service_role');

-- ============================================================================
-- MONETIZATION_REQUIREMENTS (consolidate)
-- ============================================================================
DROP POLICY IF EXISTS "Anyone can view monetization requirements" ON monetization_requirements;
DROP POLICY IF EXISTS "Service role can manage monetization requirements" ON monetization_requirements;
CREATE POLICY "Public read monetization requirements" ON monetization_requirements
  FOR SELECT USING (true);
CREATE POLICY "Service role manages monetization" ON monetization_requirements
  FOR ALL USING ((select auth.jwt()->>'role') = 'service_role');

-- ============================================================================
-- COMMENT_LIKES (user_id is UUID type, not TEXT)
-- ============================================================================
DROP POLICY IF EXISTS "Authenticated users can like comments" ON comment_likes;
CREATE POLICY "Authenticated users can like comments" ON comment_likes
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete their own likes" ON comment_likes;
CREATE POLICY "Users can delete their own likes" ON comment_likes
  FOR DELETE USING ((select auth.uid()) = user_id);


-- ============================================================================
-- FRIEND_REQUESTS
-- ============================================================================
DROP POLICY IF EXISTS "friend_requests_select_involved" ON friend_requests;
CREATE POLICY "friend_requests_select_involved" ON friend_requests
  FOR SELECT USING (
    (select auth.uid())::text = sender_id OR 
    (select auth.uid())::text = receiver_id
  );

DROP POLICY IF EXISTS "friend_requests_insert_as_sender" ON friend_requests;
CREATE POLICY "friend_requests_insert_as_sender" ON friend_requests
  FOR INSERT WITH CHECK ((select auth.uid())::text = sender_id);

DROP POLICY IF EXISTS "friend_requests_update_received" ON friend_requests;
CREATE POLICY "friend_requests_update_received" ON friend_requests
  FOR UPDATE USING ((select auth.uid())::text = receiver_id);

DROP POLICY IF EXISTS "friend_requests_delete_involved" ON friend_requests;
CREATE POLICY "friend_requests_delete_involved" ON friend_requests
  FOR DELETE USING (
    (select auth.uid())::text = sender_id OR 
    (select auth.uid())::text = receiver_id
  );

-- ============================================================================
-- TRANSACTIONS (consolidate, use authenticated check since schema unknown)
-- ============================================================================
DROP POLICY IF EXISTS "Authenticated users can view transactions" ON transactions;
DROP POLICY IF EXISTS "Service role can manage transactions" ON transactions;
CREATE POLICY "Authenticated users can view transactions" ON transactions
  FOR SELECT USING ((select auth.role()) = 'authenticated');
CREATE POLICY "Service role manages transactions" ON transactions
  FOR ALL USING ((select auth.jwt()->>'role') = 'service_role');


-- ============================================================================
-- BRAND_PRICING (consolidate)
-- ============================================================================
DROP POLICY IF EXISTS "Anyone can view brand pricing" ON brand_pricing;
DROP POLICY IF EXISTS "Service role can manage brand pricing" ON brand_pricing;
CREATE POLICY "Public read brand pricing" ON brand_pricing
  FOR SELECT USING (true);
CREATE POLICY "Service role manages brand pricing" ON brand_pricing
  FOR ALL USING ((select auth.jwt()->>'role') = 'service_role');

-- ============================================================================
-- GROUP_MESSAGES
-- ============================================================================
DROP POLICY IF EXISTS "View messages" ON group_messages;
CREATE POLICY "View messages" ON group_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = group_messages.group_id
      AND group_members.user_id = (select auth.uid())::text
    )
  );

DROP POLICY IF EXISTS "Send messages" ON group_messages;
CREATE POLICY "Send messages" ON group_messages
  FOR INSERT WITH CHECK (
    sender_id = (select auth.uid())::text AND
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = group_messages.group_id
      AND group_members.user_id = (select auth.uid())::text
    )
  );

-- ============================================================================
-- STORY_SAVES
-- ============================================================================
DROP POLICY IF EXISTS "Users can save stories" ON story_saves;
CREATE POLICY "Users can save stories" ON story_saves
  FOR INSERT WITH CHECK ((select auth.uid())::text = user_id);

DROP POLICY IF EXISTS "Users can unsave stories" ON story_saves;
CREATE POLICY "Users can unsave stories" ON story_saves
  FOR DELETE USING ((select auth.uid())::text = user_id);

-- ============================================================================
-- TOKEN_TRANSACTIONS
-- ============================================================================
DROP POLICY IF EXISTS "Users can view their transactions" ON token_transactions;
CREATE POLICY "Users can view their transactions" ON token_transactions
  FOR SELECT USING (
    (select auth.uid())::text = from_user_id OR 
    (select auth.uid())::text = to_user_id
  );

DROP POLICY IF EXISTS "Authenticated users can insert transactions" ON token_transactions;
CREATE POLICY "Authenticated users can insert transactions" ON token_transactions
  FOR INSERT WITH CHECK ((select auth.role()) = 'authenticated');

-- ============================================================================
-- GROUP_MEMBERS (consolidate INSERT/DELETE)
-- ============================================================================
DROP POLICY IF EXISTS "Users can join groups" ON group_members;
DROP POLICY IF EXISTS "Admins can add members" ON group_members;
DROP POLICY IF EXISTS "Users can leave groups" ON group_members;
DROP POLICY IF EXISTS "Admins can remove members" ON group_members;

CREATE POLICY "Members can join or admins can add" ON group_members
  FOR INSERT WITH CHECK (
    user_id = (select auth.uid())::text OR
    EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = group_members.group_id
      AND gm.user_id = (select auth.uid())::text
      AND gm.role = 'admin'
    )
  );

CREATE POLICY "Members can leave or admins can remove" ON group_members
  FOR DELETE USING (
    user_id = (select auth.uid())::text OR
    EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = group_members.group_id
      AND gm.user_id = (select auth.uid())::text
      AND gm.role = 'admin'
    )
  );

-- ============================================================================
-- MESSAGE_LIKES (user_id is UUID type, not TEXT)
-- ============================================================================
DROP POLICY IF EXISTS "Users can like messages in conversations they are part of" ON message_likes;
CREATE POLICY "Users can like messages in conversations they are part of" ON message_likes
  FOR INSERT WITH CHECK (
    user_id = (select auth.uid()) AND
    EXISTS (
      SELECT 1 FROM messages m
      JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id
      WHERE m.id = message_likes.message_id
      AND cp.user_id = (select auth.uid())::text
    )
  );

DROP POLICY IF EXISTS "Users can unlike their own likes" ON message_likes;
CREATE POLICY "Users can unlike their own likes" ON message_likes
  FOR DELETE USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view likes for messages in conversations they are par" ON message_likes;
CREATE POLICY "Users can view likes in their conversations" ON message_likes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM messages m
      JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id
      WHERE m.id = message_likes.message_id
      AND cp.user_id = (select auth.uid())::text
    )
  );

-- ============================================================================
-- GROUP_MESSAGE_LIKES (user_id is UUID type, not TEXT)
-- ============================================================================
DROP POLICY IF EXISTS "Members can like group messages" ON group_message_likes;
CREATE POLICY "Members can like group messages" ON group_message_likes
  FOR INSERT WITH CHECK (
    user_id = (select auth.uid()) AND
    EXISTS (
      SELECT 1 FROM group_messages gm
      JOIN group_members gmem ON gmem.group_id = gm.group_id
      WHERE gm.id = group_message_likes.message_id
      AND gmem.user_id = (select auth.uid())::text
    )
  );

DROP POLICY IF EXISTS "Users can unlike their own group message likes" ON group_message_likes;
CREATE POLICY "Users can unlike their own group message likes" ON group_message_likes
  FOR DELETE USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Members can view group message likes" ON group_message_likes;
CREATE POLICY "Members can view group message likes" ON group_message_likes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM group_messages gm
      JOIN group_members gmem ON gmem.group_id = gm.group_id
      WHERE gm.id = group_message_likes.message_id
      AND gmem.user_id = (select auth.uid())::text
    )
  );

-- ============================================================================
-- STORY_LIKES
-- ============================================================================
DROP POLICY IF EXISTS "Users can like stories" ON story_likes;
CREATE POLICY "Users can like stories" ON story_likes
  FOR INSERT WITH CHECK ((select auth.uid())::text = user_id);

DROP POLICY IF EXISTS "Users can remove their likes" ON story_likes;
CREATE POLICY "Users can remove their likes" ON story_likes
  FOR DELETE USING ((select auth.uid())::text = user_id);

-- ============================================================================
-- STORY_COMMENTS
-- ============================================================================
DROP POLICY IF EXISTS "Users can comment on stories" ON story_comments;
CREATE POLICY "Users can comment on stories" ON story_comments
  FOR INSERT WITH CHECK ((select auth.uid())::text = user_id);

DROP POLICY IF EXISTS "Users can delete their comments" ON story_comments;
CREATE POLICY "Users can delete their comments" ON story_comments
  FOR DELETE USING ((select auth.uid())::text = user_id);

-- ============================================================================
-- CONTRIBUTIONS
-- ============================================================================
DROP POLICY IF EXISTS "Users can add contributions" ON contributions;
CREATE POLICY "Users can add contributions" ON contributions
  FOR INSERT WITH CHECK ((select auth.role()) = 'authenticated');

-- ============================================================================
-- PROFILES
-- ============================================================================
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
CREATE POLICY "Users can insert their own profile" ON profiles
  FOR INSERT WITH CHECK ((select auth.uid())::text = user_id);

DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE 
  USING ((select auth.uid())::text = user_id)
  WITH CHECK ((select auth.uid())::text = user_id);

-- ============================================================================
-- STORIES
-- ============================================================================
DROP POLICY IF EXISTS "Users can create stories" ON stories;
CREATE POLICY "Users can create stories" ON stories
  FOR INSERT WITH CHECK (creator_id = (select auth.uid())::text);

DROP POLICY IF EXISTS "Creators and participants can update stories" ON stories;
CREATE POLICY "Creators and participants can update stories" ON stories
  FOR UPDATE USING (
    creator_id = (select auth.uid())::text OR
    EXISTS (
      SELECT 1 FROM story_participants
      WHERE story_id = stories.id
      AND user_id = (select auth.uid())::text
    )
  );

DROP POLICY IF EXISTS "Creators can delete their stories" ON stories;
CREATE POLICY "Creators can delete their stories" ON stories
  FOR DELETE USING (creator_id = (select auth.uid())::text);

-- ============================================================================
-- STORY_PARTICIPANTS
-- ============================================================================
DROP POLICY IF EXISTS "Story participants can be added" ON story_participants;
CREATE POLICY "Story participants can be added" ON story_participants
  FOR INSERT WITH CHECK (
    user_id = (select auth.uid())::text OR
    EXISTS (SELECT 1 FROM stories WHERE id = story_id AND creator_id = (select auth.uid())::text)
  );

DROP POLICY IF EXISTS "Story participants can be removed" ON story_participants;
CREATE POLICY "Story participants can be removed" ON story_participants
  FOR DELETE USING (
    user_id = (select auth.uid())::text OR
    EXISTS (SELECT 1 FROM stories WHERE id = story_id AND creator_id = (select auth.uid())::text)
  );

-- ============================================================================
-- GROUPS
-- ============================================================================
DROP POLICY IF EXISTS "Groups can be created" ON groups;
CREATE POLICY "Groups can be created" ON groups
  FOR INSERT WITH CHECK ((select auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "Groups can be updated by owner" ON groups;
CREATE POLICY "Groups can be updated by owner" ON groups
  FOR UPDATE USING (owner_id = (select auth.uid())::text);

DROP POLICY IF EXISTS "Groups can be deleted by owner" ON groups;
CREATE POLICY "Groups can be deleted by owner" ON groups
  FOR DELETE USING (owner_id = (select auth.uid())::text);

-- ============================================================================
-- NOTIFICATIONS
-- ============================================================================
DROP POLICY IF EXISTS "notifications_select_own" ON notifications;
CREATE POLICY "notifications_select_own" ON notifications
  FOR SELECT USING ((select auth.uid())::text = user_id);

DROP POLICY IF EXISTS "notifications_insert_authenticated" ON notifications;
CREATE POLICY "notifications_insert_authenticated" ON notifications
  FOR INSERT WITH CHECK ((select auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "notifications_update_own" ON notifications;
CREATE POLICY "notifications_update_own" ON notifications
  FOR UPDATE USING ((select auth.uid())::text = user_id);

DROP POLICY IF EXISTS "notifications_delete_own" ON notifications;
CREATE POLICY "notifications_delete_own" ON notifications
  FOR DELETE USING ((select auth.uid())::text = user_id);

-- ============================================================================
-- GROUP_ROLES
-- ============================================================================
DROP POLICY IF EXISTS "Group admins can create roles" ON group_roles;
CREATE POLICY "Group admins can create roles" ON group_roles
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = group_roles.group_id
      AND group_members.user_id = (select auth.uid())::text
      AND group_members.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Group admins can update roles" ON group_roles;
CREATE POLICY "Group admins can update roles" ON group_roles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = group_roles.group_id
      AND group_members.user_id = (select auth.uid())::text
      AND group_members.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Group admins can delete roles" ON group_roles;
CREATE POLICY "Group admins can delete roles" ON group_roles
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = group_roles.group_id
      AND group_members.user_id = (select auth.uid())::text
      AND group_members.role = 'admin'
    )
  );

-- ============================================================================
-- MEMBER_ROLES
-- ============================================================================
DROP POLICY IF EXISTS "Group admins can assign roles" ON member_roles;
CREATE POLICY "Group admins can assign roles" ON member_roles
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = member_roles.group_id
      AND group_members.user_id = (select auth.uid())::text
      AND group_members.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Group admins can update role assignments" ON member_roles;
CREATE POLICY "Group admins can update role assignments" ON member_roles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = member_roles.group_id
      AND group_members.user_id = (select auth.uid())::text
      AND group_members.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Group admins can remove role assignments" ON member_roles;
CREATE POLICY "Group admins can remove role assignments" ON member_roles
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = member_roles.group_id
      AND group_members.user_id = (select auth.uid())::text
      AND group_members.role = 'admin'
    )
  );

-- ============================================================================
-- HASHTAGS (consolidate)
-- ============================================================================
DROP POLICY IF EXISTS "Anyone can view hashtags" ON hashtags;
DROP POLICY IF EXISTS "Service role can manage hashtags" ON hashtags;
DROP POLICY IF EXISTS "Trigger can manage hashtags" ON hashtags;

CREATE POLICY "Public read hashtags" ON hashtags
  FOR SELECT USING (true);

-- Service role and triggers can write (triggers run without JWT context)
CREATE POLICY "System manages hashtags" ON hashtags
  FOR ALL USING (
    (select auth.jwt()->>'role') = 'service_role' OR
    (select current_setting('request.jwt.claims', true)) IS NULL
  );

-- ============================================================================
-- FRIENDSHIPS
-- ============================================================================
DROP POLICY IF EXISTS "Users can create friendships" ON friendships;
CREATE POLICY "Users can create friendships" ON friendships
  FOR INSERT WITH CHECK ((select auth.uid())::text = user_id);

DROP POLICY IF EXISTS "Users can delete their friendships" ON friendships;
CREATE POLICY "Users can delete their friendships" ON friendships
  FOR DELETE USING ((select auth.uid())::text = user_id);

-- ============================================================================
-- DONE
-- ============================================================================
