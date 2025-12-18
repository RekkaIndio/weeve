-- Notification System Migration for Weeve
-- Run this SQL in your Supabase SQL Editor after the main schema.sql

-- ============================================
-- FRIEND REQUESTS TABLE
-- ============================================
-- Replaces instant bidirectional friendships with request/accept flow
CREATE TABLE IF NOT EXISTS friend_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id TEXT NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  receiver_id TEXT NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'declined')) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(sender_id, receiver_id)
);

-- ============================================
-- NOTIFICATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'friend_request',
    'friend_accepted',
    'story_invite',
    'story_turn',
    'story_completed',
    'story_liked',
    'story_commented',
    'group_invite',
    'group_update',
    'group_joined',
    'mention'
  )),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB, -- Flexible data for type-specific info (story_id, user_id, etc.)
  read BOOLEAN DEFAULT FALSE,
  action_url TEXT, -- Deep link to related content
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_friend_requests_sender ON friend_requests(sender_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_receiver ON friend_requests(receiver_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_status ON friend_requests(status);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, read);

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================
ALTER TABLE friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Friend requests: users can view requests they sent or received
DROP POLICY IF EXISTS "Users can view their friend requests" ON friend_requests;
CREATE POLICY "Users can view their friend requests" ON friend_requests
  FOR SELECT USING (sender_id = auth.uid()::text OR receiver_id = auth.uid()::text);

DROP POLICY IF EXISTS "Users can create friend requests" ON friend_requests;
CREATE POLICY "Users can create friend requests" ON friend_requests
  FOR INSERT WITH CHECK (sender_id = auth.uid()::text);

DROP POLICY IF EXISTS "Users can update received requests" ON friend_requests;
CREATE POLICY "Users can update received requests" ON friend_requests
  FOR UPDATE USING (receiver_id = auth.uid()::text);

-- Notifications: users can only view their own
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
CREATE POLICY "Users can view their own notifications" ON notifications
  FOR SELECT USING (user_id = auth.uid()::text);

DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
CREATE POLICY "Users can update their own notifications" ON notifications
  FOR UPDATE USING (user_id = auth.uid()::text);

-- Allow users to delete their own notifications
DROP POLICY IF EXISTS "Users can delete their own notifications" ON notifications;
CREATE POLICY "Users can delete their own notifications" ON notifications
  FOR DELETE USING (user_id = auth.uid()::text);

-- System can create notifications (via service role)
DROP POLICY IF EXISTS "System can create notifications" ON notifications;
CREATE POLICY "System can create notifications" ON notifications
  FOR INSERT WITH CHECK (true);

-- ============================================
-- TRIGGERS AND FUNCTIONS
-- ============================================

-- Trigger to update friend_requests updated_at
DROP TRIGGER IF EXISTS update_friend_requests_updated_at ON friend_requests;
CREATE TRIGGER update_friend_requests_updated_at BEFORE UPDATE ON friend_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to create friendship when request is accepted
CREATE OR REPLACE FUNCTION accept_friend_request()
RETURNS TRIGGER AS $$
DECLARE
  sender_name TEXT;
  receiver_name TEXT;
BEGIN
  IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
    -- Create bidirectional friendship
    INSERT INTO friendships (user_id, friend_id)
    VALUES (NEW.sender_id, NEW.receiver_id), (NEW.receiver_id, NEW.sender_id)
    ON CONFLICT DO NOTHING;
    
    -- Get names for notification
    SELECT name INTO receiver_name FROM profiles WHERE user_id = NEW.receiver_id;
    
    -- Create notification for sender
    INSERT INTO notifications (user_id, type, title, message, data, action_url)
    VALUES (
      NEW.sender_id,
      'friend_accepted',
      'Friend Request Accepted',
      receiver_name || ' accepted your friend request',
      jsonb_build_object('friend_id', NEW.receiver_id),
      '/profile/' || NEW.receiver_id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_friend_request_accepted ON friend_requests;
CREATE TRIGGER on_friend_request_accepted
  AFTER UPDATE ON friend_requests
  FOR EACH ROW
  EXECUTE FUNCTION accept_friend_request();

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
-- Next steps:
-- 1. Existing friendships remain unchanged
-- 2. New connections will use friend_requests table
-- 3. Notifications will start accumulating immediately
