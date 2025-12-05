-- Blocked Users Table Migration
-- Run this SQL in your Supabase SQL Editor

-- Create blocked_users table
CREATE TABLE IF NOT EXISTS blocked_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  blocked_user_id TEXT NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, blocked_user_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_blocked_users_user_id ON blocked_users(user_id);
CREATE INDEX IF NOT EXISTS idx_blocked_users_blocked_user_id ON blocked_users(blocked_user_id);

-- Enable RLS
ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view their own blocked users" ON blocked_users;
CREATE POLICY "Users can view their own blocked users" ON blocked_users
  FOR SELECT USING (user_id = auth.uid()::text);

DROP POLICY IF EXISTS "Users can block other users" ON blocked_users;
CREATE POLICY "Users can block other users" ON blocked_users
  FOR INSERT WITH CHECK (user_id = auth.uid()::text);

DROP POLICY IF EXISTS "Users can unblock users" ON blocked_users;
CREATE POLICY "Users can unblock users" ON blocked_users
  FOR DELETE USING (user_id = auth.uid()::text);

-- Notification Preferences Table
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT UNIQUE NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  push_notifications BOOLEAN DEFAULT TRUE,
  email_notifications BOOLEAN DEFAULT TRUE,
  story_invites BOOLEAN DEFAULT TRUE,
  story_turns BOOLEAN DEFAULT TRUE,
  story_completed BOOLEAN DEFAULT TRUE,
  story_likes BOOLEAN DEFAULT TRUE,
  story_comments BOOLEAN DEFAULT TRUE,
  friend_requests BOOLEAN DEFAULT TRUE,
  friend_accepted BOOLEAN DEFAULT TRUE,
  group_invites BOOLEAN DEFAULT TRUE,
  group_updates BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON notification_preferences(user_id);

-- Enable RLS
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view their own preferences" ON notification_preferences;
CREATE POLICY "Users can view their own preferences" ON notification_preferences
  FOR SELECT USING (user_id = auth.uid()::text);

DROP POLICY IF EXISTS "Users can update their own preferences" ON notification_preferences;
CREATE POLICY "Users can update their own preferences" ON notification_preferences
  FOR ALL USING (user_id = auth.uid()::text);

-- Support Tickets Table
CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('bug', 'abuse', 'feature', 'account', 'other')),
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')) DEFAULT 'open',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at ON support_tickets(created_at DESC);

-- Enable RLS
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view their own tickets" ON support_tickets;
CREATE POLICY "Users can view their own tickets" ON support_tickets
  FOR SELECT USING (user_id = auth.uid()::text);

DROP POLICY IF EXISTS "Users can create tickets" ON support_tickets;
CREATE POLICY "Users can create tickets" ON support_tickets
  FOR INSERT WITH CHECK (user_id = auth.uid()::text);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_notification_preferences_updated_at ON notification_preferences;
CREATE TRIGGER update_notification_preferences_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_support_tickets_updated_at ON support_tickets;
CREATE TRIGGER update_support_tickets_updated_at
  BEFORE UPDATE ON support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SUPPORT EMAIL QUEUE TABLE
-- ============================================
-- This table queues support emails to be sent
-- You can process this with a Supabase Edge Function or external service

CREATE TABLE IF NOT EXISTS support_email_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  to_email TEXT NOT NULL,
  user_name TEXT NOT NULL,
  user_id TEXT NOT NULL,
  category TEXT NOT NULL,
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'failed')) DEFAULT 'pending',
  retry_count INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_support_email_queue_status ON support_email_queue(status);
CREATE INDEX IF NOT EXISTS idx_support_email_queue_created_at ON support_email_queue(created_at DESC);

-- Enable RLS (allow service role full access)
ALTER TABLE support_email_queue ENABLE ROW LEVEL SECURITY;

-- Service role can do everything
DROP POLICY IF EXISTS "Service role full access" ON support_email_queue;
CREATE POLICY "Service role full access" ON support_email_queue
  FOR ALL USING (true);

-- ============================================
-- OPTIONAL: Database Function to Send Email via HTTP
-- ============================================
-- This function can be called by a trigger to send emails automatically
-- Requires pg_net extension and proper email service configuration

-- Enable pg_net extension if available (for HTTP requests from database)
-- CREATE EXTENSION IF NOT EXISTS pg_net;

-- Example trigger function to auto-send emails (uncomment when pg_net is set up)
-- CREATE OR REPLACE FUNCTION send_support_email()
-- RETURNS TRIGGER AS $$
-- BEGIN
--   -- Call external email service API
--   PERFORM net.http_post(
--     url := 'https://api.resend.com/emails',
--     headers := jsonb_build_object(
--       'Authorization', 'Bearer ' || current_setting('app.resend_api_key'),
--       'Content-Type', 'application/json'
--     ),
--     body := jsonb_build_object(
--       'from', 'Weeve Support <support@tryweeve.com>',
--       'to', NEW.to_email,
--       'subject', '[' || upper(NEW.category) || '] ' || NEW.subject,
--       'html', '<h2>New Support Request</h2>' ||
--               '<p><strong>From:</strong> ' || NEW.user_name || ' (User ID: ' || NEW.user_id || ')</p>' ||
--               '<p><strong>Category:</strong> ' || NEW.category || '</p>' ||
--               '<p><strong>Subject:</strong> ' || NEW.subject || '</p>' ||
--               '<p><strong>Description:</strong></p>' ||
--               '<p>' || NEW.description || '</p>'
--     )
--   );
--   
--   -- Update status to sent
--   NEW.status := 'sent';
--   NEW.sent_at := NOW();
--   
--   RETURN NEW;
-- EXCEPTION WHEN OTHERS THEN
--   -- Mark as failed and log error
--   NEW.status := 'failed';
--   NEW.error_message := SQLERRM;
--   NEW.retry_count := NEW.retry_count + 1;
--   RETURN NEW;
-- END;
-- $$ LANGUAGE plpgsql;

-- CREATE TRIGGER on_support_email_queued
--   BEFORE INSERT ON support_email_queue
--   FOR EACH ROW
--   EXECUTE FUNCTION send_support_email();
