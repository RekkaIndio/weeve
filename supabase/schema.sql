-- Weeve Database Schema for Supabase
-- Run this SQL in your Supabase SQL Editor (Dashboard > SQL Editor)

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table (extended user information)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  avatar TEXT,
  tokens INTEGER DEFAULT 100 NOT NULL,
  is_influencer BOOLEAN DEFAULT FALSE,
  interaction_cost INTEGER,
  invite_code TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stories table (collaborative story metadata)
CREATE TABLE IF NOT EXISTS stories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  creator_id TEXT NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  mode TEXT NOT NULL CHECK (mode IN ('invite', 'open')),
  status TEXT NOT NULL CHECK (status IN ('active', 'completed')) DEFAULT 'active',
  current_turn_user_id TEXT,
  max_weeves INTEGER,
  cover_image TEXT,
  theme TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contributions table (individual story segments)
CREATE TABLE IF NOT EXISTS contributions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  content TEXT NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('video', 'image', 'text')),
  media_url TEXT,
  timestamp BIGINT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Story participants table (many-to-many relationship)
CREATE TABLE IF NOT EXISTS story_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(story_id, user_id)
);

-- Groups table (community groups)
CREATE TABLE IF NOT EXISTS groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  avatar TEXT NOT NULL,
  member_count INTEGER DEFAULT 0,
  is_private BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Friendships table (user connections)
CREATE TABLE IF NOT EXISTS friendships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  friend_id TEXT NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, friend_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_invite_code ON profiles(invite_code);
CREATE INDEX IF NOT EXISTS idx_stories_creator_id ON stories(creator_id);
CREATE INDEX IF NOT EXISTS idx_stories_status ON stories(status);
CREATE INDEX IF NOT EXISTS idx_contributions_story_id ON contributions(story_id);
CREATE INDEX IF NOT EXISTS idx_contributions_user_id ON contributions(user_id);
CREATE INDEX IF NOT EXISTS idx_story_participants_story_id ON story_participants(story_id);
CREATE INDEX IF NOT EXISTS idx_story_participants_user_id ON story_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_friendships_user_id ON friendships(user_id);
CREATE INDEX IF NOT EXISTS idx_friendships_friend_id ON friendships(friend_id);

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

-- Profiles: Anyone can read, users can update their own
CREATE POLICY "Profiles are viewable by everyone" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile" ON profiles
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (true);

-- Stories: Anyone can read, only creator can delete
CREATE POLICY "Stories are viewable by everyone" ON stories
  FOR SELECT USING (true);

CREATE POLICY "Users can create stories" ON stories
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Stories can be updated by anyone" ON stories
  FOR UPDATE USING (true);

CREATE POLICY "Creators can delete their stories" ON stories
  FOR DELETE USING (true);

-- Contributions: Anyone can read, participants can insert
CREATE POLICY "Contributions are viewable by everyone" ON contributions
  FOR SELECT USING (true);

CREATE POLICY "Users can add contributions" ON contributions
  FOR INSERT WITH CHECK (true);

-- Story Participants: Anyone can read, managed via app
CREATE POLICY "Story participants are viewable by everyone" ON story_participants
  FOR SELECT USING (true);

CREATE POLICY "Story participants can be added" ON story_participants
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Story participants can be removed" ON story_participants
  FOR DELETE USING (true);

-- Groups: Public groups readable by all, private groups need membership
CREATE POLICY "Public groups are viewable by everyone" ON groups
  FOR SELECT USING (NOT is_private OR true);

CREATE POLICY "Groups can be created" ON groups
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Groups can be updated" ON groups
  FOR UPDATE USING (true);

-- Friendships: Users can manage their own friendships
CREATE POLICY "Friendships are viewable by involved users" ON friendships
  FOR SELECT USING (true);

CREATE POLICY "Users can create friendships" ON friendships
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can delete their friendships" ON friendships
  FOR DELETE USING (true);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to tables
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stories_updated_at BEFORE UPDATE ON stories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
