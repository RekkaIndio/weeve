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
  is_private BOOLEAN DEFAULT FALSE,
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
  visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('public', 'private')),
  status TEXT NOT NULL CHECK (status IN ('active', 'completed')) DEFAULT 'active',
  current_turn_user_id TEXT,
  max_weeves INTEGER,
  cover_image TEXT,
  theme TEXT,
  group_id UUID REFERENCES groups(id) ON DELETE SET NULL,
  monetization_cost INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add monetization_cost column for existing environments
ALTER TABLE stories
  ADD COLUMN IF NOT EXISTS monetization_cost INTEGER;

-- Add check constraint to ensure monetization_cost is non-negative
ALTER TABLE stories
  ADD CONSTRAINT IF NOT EXISTS check_monetization_cost_non_negative CHECK (monetization_cost >= 0);

-- Contributions table (individual story segments)
CREATE TABLE IF NOT EXISTS contributions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  content TEXT NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('video', 'image', 'text', 'drawing')),
  media_url TEXT,
  timestamp BIGINT NOT NULL,
  text_style JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Story likes table (per-user likes)
CREATE TABLE IF NOT EXISTS story_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(story_id, user_id)
);

-- Story comments table
CREATE TABLE IF NOT EXISTS story_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  content TEXT NOT NULL,
  timestamp BIGINT NOT NULL DEFAULT (floor(extract(epoch FROM NOW()) * 1000)),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enforce max_weeves limit per story and auto-complete stories at capacity
CREATE OR REPLACE FUNCTION enforce_story_contribution_limit()
RETURNS TRIGGER AS $$
DECLARE
  max_limit INTEGER;
  existing_count INTEGER;
BEGIN
  SELECT max_weeves INTO max_limit FROM stories WHERE id = NEW.story_id;

  IF max_limit IS NULL OR max_limit <= 0 THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO existing_count FROM contributions WHERE story_id = NEW.story_id;

  IF existing_count >= max_limit THEN
    RAISE EXCEPTION 'Contribution limit reached for this story';
  END IF;

  IF existing_count + 1 = max_limit THEN
    UPDATE stories
    SET status = 'completed',
        current_turn_user_id = NULL,
        updated_at = NOW()
    WHERE id = NEW.story_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_story_contribution_limit ON contributions;
CREATE TRIGGER enforce_story_contribution_limit
  BEFORE INSERT ON contributions
  FOR EACH ROW
  EXECUTE FUNCTION enforce_story_contribution_limit();

-- Story participants table (many-to-many relationship)
CREATE TABLE IF NOT EXISTS story_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('accepted', 'waiting', 'declined')) DEFAULT 'accepted',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(story_id, user_id)
);

-- Ensure status column exists for environments created before this column was added
ALTER TABLE story_participants
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL CHECK (status IN ('accepted', 'waiting', 'declined')) DEFAULT 'accepted';

-- Groups table (community groups)
CREATE TABLE IF NOT EXISTS groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  avatar TEXT NOT NULL,
  member_count INTEGER DEFAULT 0,
  is_private BOOLEAN DEFAULT FALSE,
  owner_id TEXT REFERENCES profiles(user_id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure owner_id column exists for environments created before this column was added
ALTER TABLE groups
  ADD COLUMN IF NOT EXISTS owner_id TEXT REFERENCES profiles(user_id) ON DELETE CASCADE;

-- Group Members table (tracking membership and roles)
CREATE TABLE IF NOT EXISTS group_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'member')) DEFAULT 'member',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_id, user_id)
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
CREATE INDEX IF NOT EXISTS idx_story_likes_story_id ON story_likes(story_id);
CREATE INDEX IF NOT EXISTS idx_story_likes_user_id ON story_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_story_comments_story_id ON story_comments(story_id);
CREATE INDEX IF NOT EXISTS idx_story_comments_user_id ON story_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_story_participants_story_id ON story_participants(story_id);
CREATE INDEX IF NOT EXISTS idx_story_participants_user_id ON story_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_friendships_user_id ON friendships(user_id);
CREATE INDEX IF NOT EXISTS idx_friendships_friend_id ON friendships(friend_id);

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_comments ENABLE ROW LEVEL SECURITY;

-- Ensure text_style column exists for environments created before this column was added
ALTER TABLE contributions
  ADD COLUMN IF NOT EXISTS text_style JSONB;
ALTER TABLE story_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

-- Ensure visibility column exists for environments created before it was added
ALTER TABLE stories
  ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('public', 'private'));

-- Ensure group_id column exists for environments created before it was added
ALTER TABLE stories
  ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES groups(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_stories_group_id ON stories(group_id);

-- Profiles: Anyone can read, users can update their own
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;
CREATE POLICY "Profiles are viewable by everyone" ON profiles
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
CREATE POLICY "Users can insert their own profile" ON profiles
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (true);

-- Stories: Anyone can read, only creator can delete
DROP POLICY IF EXISTS "Stories are viewable by everyone" ON stories;
CREATE POLICY "Stories are viewable by everyone" ON stories
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can create stories" ON stories;
CREATE POLICY "Users can create stories" ON stories
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Stories can be updated by anyone" ON stories;
CREATE POLICY "Stories can be updated by anyone" ON stories
  FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Creators can delete their stories" ON stories;
CREATE POLICY "Creators can delete their stories" ON stories
  FOR DELETE USING (true);

-- Contributions: Anyone can read, participants can insert
DROP POLICY IF EXISTS "Contributions are viewable by everyone" ON contributions;
CREATE POLICY "Contributions are viewable by everyone" ON contributions
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can add contributions" ON contributions;
CREATE POLICY "Users can add contributions" ON contributions
  FOR INSERT WITH CHECK (true);

-- Story Likes Policies
DROP POLICY IF EXISTS "Story likes are viewable by everyone" ON story_likes;
CREATE POLICY "Story likes are viewable by everyone" ON story_likes
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can like stories" ON story_likes;
CREATE POLICY "Users can like stories" ON story_likes
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND user_id = auth.uid()::text);

DROP POLICY IF EXISTS "Users can remove their likes" ON story_likes;
CREATE POLICY "Users can remove their likes" ON story_likes
  FOR DELETE USING (auth.role() = 'authenticated' AND user_id = auth.uid()::text);

-- Story Comments Policies
DROP POLICY IF EXISTS "Story comments are viewable by everyone" ON story_comments;
CREATE POLICY "Story comments are viewable by everyone" ON story_comments
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can comment on stories" ON story_comments;
CREATE POLICY "Users can comment on stories" ON story_comments
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND user_id = auth.uid()::text);

DROP POLICY IF EXISTS "Users can delete their comments" ON story_comments;
CREATE POLICY "Users can delete their comments" ON story_comments
  FOR DELETE USING (auth.role() = 'authenticated' AND user_id = auth.uid()::text);

-- Story Participants: Anyone can read, managed via app
DROP POLICY IF EXISTS "Story participants are viewable by everyone" ON story_participants;
CREATE POLICY "Story participants are viewable by everyone" ON story_participants
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Story participants can be added" ON story_participants;
CREATE POLICY "Story participants can be added" ON story_participants
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Story participants can be removed" ON story_participants;
CREATE POLICY "Story participants can be removed" ON story_participants
  FOR DELETE USING (true);

-- Groups: Public groups readable by all, private groups need membership
DROP POLICY IF EXISTS "Public groups are viewable by everyone" ON groups;
CREATE POLICY "Public groups are viewable by everyone" ON groups
  FOR SELECT USING (NOT is_private OR true); -- Allow viewing all for now to see them in list, maybe filter in UI or refine later

DROP POLICY IF EXISTS "Groups can be created" ON groups;
CREATE POLICY "Groups can be created" ON groups
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Groups can be updated by owner" ON groups;
CREATE POLICY "Groups can be updated by owner" ON groups
  FOR UPDATE USING (auth.uid()::text = owner_id);

DROP POLICY IF EXISTS "Groups can be deleted by owner" ON groups;
CREATE POLICY "Groups can be deleted by owner" ON groups
  FOR DELETE USING (auth.uid()::text = owner_id);

-- Group Members Policies
DROP POLICY IF EXISTS "Group members viewable by everyone" ON group_members;
CREATE POLICY "Group members viewable by everyone" ON group_members
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can join open groups" ON group_members;
CREATE POLICY "Anyone can join open groups" ON group_members
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated' AND
    (
      EXISTS (
        SELECT 1 FROM groups WHERE id = group_id AND is_private = false
      ) OR
      EXISTS (
        SELECT 1 FROM groups WHERE id = group_id AND owner_id = auth.uid()::text
      )
    )
  );

DROP POLICY IF EXISTS "Admins can add members" ON group_members;
CREATE POLICY "Admins can add members" ON group_members
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_id = group_members.group_id
      AND user_id = auth.uid()::text
      AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can remove members" ON group_members;
CREATE POLICY "Admins can remove members" ON group_members
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_id = group_members.group_id
      AND user_id = auth.uid()::text
      AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Users can leave groups" ON group_members;
CREATE POLICY "Users can leave groups" ON group_members
  FOR DELETE USING (auth.uid()::text = user_id);

-- Friendships: Users can manage their own friendships
DROP POLICY IF EXISTS "Friendships are viewable by involved users" ON friendships;
CREATE POLICY "Friendships are viewable by involved users" ON friendships
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can create friendships" ON friendships;
CREATE POLICY "Users can create friendships" ON friendships
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can delete their friendships" ON friendships;
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
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_stories_updated_at ON stories;
CREATE TRIGGER update_stories_updated_at BEFORE UPDATE ON stories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- STORAGE BUCKETS
-- Note: You might need to create these buckets manually in the dashboard if SQL creation is not supported by your plan/setup,
-- but this SQL attempts to insert them if the storage schema is accessible.

-- Create 'story-media' bucket for videos and images
INSERT INTO storage.buckets (id, name, public)
VALUES ('story-media', 'story-media', true)
ON CONFLICT (id) DO NOTHING;

-- Create 'avatars' bucket for user profiles
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies (RLS for Storage)

-- Allow public read access to story-media
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'story-media' );

-- Allow authenticated users to upload to story-media
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'story-media' AND auth.role() = 'authenticated' );

-- Allow public read access to avatars
DROP POLICY IF EXISTS "Public Access Avatars" ON storage.objects;
CREATE POLICY "Public Access Avatars"
ON storage.objects FOR SELECT
USING ( bucket_id = 'avatars' );

-- Allow authenticated users to upload avatars
DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;
CREATE POLICY "Authenticated users can upload avatars"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'avatars' AND auth.role() = 'authenticated' );
