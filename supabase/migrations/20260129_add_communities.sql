-- Community Multi-Tenancy: Add communities table and link to profiles
-- This enables white-labeled Weeve instances via community codes

-- Communities table
CREATE TABLE IF NOT EXISTS communities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  description TEXT,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#EC1D99',
  accent_color TEXT DEFAULT '#06B6D4',
  owner_email TEXT,
  is_active BOOLEAN DEFAULT true,
  member_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add community_id to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS community_id UUID REFERENCES communities(id);

-- Add community_id to stories for content isolation
ALTER TABLE stories ADD COLUMN IF NOT EXISTS community_id UUID REFERENCES communities(id);

-- Add community_id to groups for content isolation
ALTER TABLE groups ADD COLUMN IF NOT EXISTS community_id UUID REFERENCES communities(id);

-- Default public community for general Weeve users
INSERT INTO communities (id, name, code, description)
VALUES ('00000000-0000-0000-0000-000000000001'::UUID, 'Weeve', 'WEEVE', 'The public Weeve community')
ON CONFLICT (id) DO NOTHING;

-- Set existing users to default community
UPDATE profiles SET community_id = '00000000-0000-0000-0000-000000000001'::UUID WHERE community_id IS NULL;

-- Set existing stories to default community
UPDATE stories SET community_id = '00000000-0000-0000-0000-000000000001'::UUID WHERE community_id IS NULL;

-- Set existing groups to default community
UPDATE groups SET community_id = '00000000-0000-0000-0000-000000000001'::UUID WHERE community_id IS NULL;

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_profiles_community_id ON profiles(community_id);
CREATE INDEX IF NOT EXISTS idx_stories_community_id ON stories(community_id);
CREATE INDEX IF NOT EXISTS idx_groups_community_id ON groups(community_id);
CREATE INDEX IF NOT EXISTS idx_communities_code ON communities(code);
CREATE INDEX IF NOT EXISTS idx_communities_is_active ON communities(is_active);

-- Enable RLS
ALTER TABLE communities ENABLE ROW LEVEL SECURITY;

-- RLS policies: Admins can do everything, users can read their own community
DROP POLICY IF EXISTS "Anyone can view active communities" ON communities;
CREATE POLICY "Anyone can view active communities"
  ON communities FOR SELECT
  USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage all communities" ON communities;
CREATE POLICY "Admins can manage all communities"
  ON communities FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.user_id = auth.uid()::TEXT 
      AND profiles.is_admin = true
    )
  );

-- Function to update member count when profiles change
CREATE OR REPLACE FUNCTION update_community_member_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Decrement old community count if changing
  IF TG_OP = 'UPDATE' AND OLD.community_id IS NOT NULL AND OLD.community_id != NEW.community_id THEN
    UPDATE communities SET member_count = member_count - 1 WHERE id = OLD.community_id;
  END IF;
  
  -- Increment new community count
  IF NEW.community_id IS NOT NULL THEN
    UPDATE communities SET member_count = member_count + 1 WHERE id = NEW.community_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to maintain member_count
DROP TRIGGER IF EXISTS on_profile_community_change ON profiles;
CREATE TRIGGER on_profile_community_change
  AFTER INSERT OR UPDATE OF community_id ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_community_member_count();

-- Update initial member counts
UPDATE communities c SET member_count = (
  SELECT COUNT(*) FROM profiles p WHERE p.community_id = c.id
);
