-- Performance Indexes Migration
-- Composite indexes for high-traffic query optimization

-- =============================================================================
-- STORIES INDEXES
-- =============================================================================

-- Feed query optimization (visibility + created_at for public feed)
CREATE INDEX IF NOT EXISTS idx_stories_visibility_created 
    ON stories(visibility, created_at DESC);

-- Group stories lookup (for group feeds)
CREATE INDEX IF NOT EXISTS idx_stories_group_visibility 
    ON stories(group_id, visibility) WHERE group_id IS NOT NULL;

-- User's own stories (profile page, sorted by date)
CREATE INDEX IF NOT EXISTS idx_stories_creator_created 
    ON stories(creator_id, created_at DESC);

-- Brand posts filtering (Canon/Seed discovery)
CREATE INDEX IF NOT EXISTS idx_stories_post_type_created 
    ON stories(post_type, created_at DESC) WHERE post_type IS NOT NULL;

-- Forked stories lookup (finding forks of a story)
CREATE INDEX IF NOT EXISTS idx_stories_forked_from 
    ON stories(forked_from_story_id) WHERE forked_from_story_id IS NOT NULL;

-- Active stories for turn-based queries
CREATE INDEX IF NOT EXISTS idx_stories_status_turn 
    ON stories(status, current_turn_user_id) WHERE status = 'active';

-- =============================================================================
-- CONTRIBUTIONS INDEXES
-- =============================================================================

-- Contributions by story and timestamp (slot ordering)
CREATE INDEX IF NOT EXISTS idx_contributions_story_timestamp 
    ON contributions(story_id, timestamp);

-- =============================================================================
-- FRIEND REQUESTS INDEXES
-- =============================================================================

-- Sender's pending requests
CREATE INDEX IF NOT EXISTS idx_friend_requests_sender_status 
    ON friend_requests(sender_id, status);

-- Receiver's pending requests
CREATE INDEX IF NOT EXISTS idx_friend_requests_receiver_status 
    ON friend_requests(receiver_id, status);

-- Bidirectional lookup for existing request check
CREATE INDEX IF NOT EXISTS idx_friend_requests_bidirectional 
    ON friend_requests(LEAST(sender_id, receiver_id), GREATEST(sender_id, receiver_id));

-- =============================================================================
-- FRIENDSHIPS INDEXES
-- =============================================================================

-- Already have user_id and friend_id indexes, add composite for JOINs
CREATE INDEX IF NOT EXISTS idx_friendships_user_friend 
    ON friendships(user_id, friend_id);

-- =============================================================================
-- NOTIFICATIONS INDEXES
-- =============================================================================

-- User notifications sorted by date (main notification feed)
CREATE INDEX IF NOT EXISTS idx_notifications_user_created 
    ON notifications(user_id, created_at DESC);

-- Unread notifications count
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread 
    ON notifications(user_id, read) WHERE read = false;

-- =============================================================================
-- MESSAGES INDEXES
-- =============================================================================

-- Messages in conversation sorted by date
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created 
    ON messages(conversation_id, created_at DESC);

-- =============================================================================
-- CONVERSATION PARTICIPANTS INDEXES
-- =============================================================================

-- User's conversations lookup
CREATE INDEX IF NOT EXISTS idx_conv_participants_user 
    ON conversation_participants(user_id, conversation_id);

-- Direct conversation lookup (user to other_user)
CREATE INDEX IF NOT EXISTS idx_conv_participants_user_other 
    ON conversation_participants(user_id, other_user_id);

-- =============================================================================
-- GROUP MEMBERS INDEXES
-- =============================================================================

-- User's group memberships (already have group_id, user_id indexes)
CREATE INDEX IF NOT EXISTS idx_group_members_user_status 
    ON group_members(user_id, status) WHERE status = 'active';

-- =============================================================================
-- STORY PARTICIPANTS INDEXES
-- =============================================================================

-- User's story participations with status
CREATE INDEX IF NOT EXISTS idx_story_participants_user_status 
    ON story_participants(user_id, status);

-- Story participants with position (for ordering)
CREATE INDEX IF NOT EXISTS idx_story_participants_story_position 
    ON story_participants(story_id, position);

-- =============================================================================
-- PROFILES INDEXES
-- =============================================================================

-- Public profiles (for discovery/search)
CREATE INDEX IF NOT EXISTS idx_profiles_public 
    ON profiles(is_private, user_id) WHERE is_private = false;

-- Brand profiles
CREATE INDEX IF NOT EXISTS idx_profiles_brand 
    ON profiles(is_brand, user_id) WHERE is_brand = true;
