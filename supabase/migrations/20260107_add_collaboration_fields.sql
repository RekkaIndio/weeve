-- Migration: Add collaboration fields to stories and profiles
-- Created: 2026-01-07
-- Description: Enables creator collaboration feature with monetization (pricing in USD cents)

-- ============================================
-- STORIES TABLE: Add collaboration fields
-- ============================================

-- Flag to indicate this is a collaboration story
ALTER TABLE stories ADD COLUMN IF NOT EXISTS is_collab BOOLEAN DEFAULT false;

-- Status of the collaboration request
ALTER TABLE stories ADD COLUMN IF NOT EXISTS collab_status TEXT CHECK (collab_status IN ('pending', 'accepted', 'declined')) DEFAULT NULL;

-- User who initiated the collaboration
ALTER TABLE stories ADD COLUMN IF NOT EXISTS collab_initiator_id UUID REFERENCES auth.users(id) DEFAULT NULL;

-- User who received the collaboration request
ALTER TABLE stories ADD COLUMN IF NOT EXISTS collab_target_id UUID REFERENCES auth.users(id) DEFAULT NULL;

-- Price paid for this collaboration (in cents, e.g., 500 = $5.00)
ALTER TABLE stories ADD COLUMN IF NOT EXISTS collab_price_cents INTEGER DEFAULT NULL;

-- ============================================
-- PROFILES TABLE: Add collaboration settings
-- ============================================

-- Whether user accepts collaboration requests
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS collab_enabled BOOLEAN DEFAULT true;

-- Price user charges for collaborations (in cents, e.g., 1000 = $10.00)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS collab_price_cents INTEGER DEFAULT NULL;

-- ============================================
-- INDEXES for efficient queries
-- ============================================

-- Index for finding collaboration stories
CREATE INDEX IF NOT EXISTS idx_stories_collab ON stories(is_collab, collab_status) WHERE is_collab = true;

-- Index for finding pending collabs for a target user
CREATE INDEX IF NOT EXISTS idx_stories_collab_target ON stories(collab_target_id, collab_status) WHERE is_collab = true;

-- Index for finding collabs initiated by a user
CREATE INDEX IF NOT EXISTS idx_stories_collab_initiator ON stories(collab_initiator_id, collab_status) WHERE is_collab = true;

-- ============================================
-- COMMENTS
-- ============================================
-- Price is stored in cents to avoid floating point issues
-- $5.00 = 500 cents
-- $10.00 = 1000 cents
-- NULL price = free collaboration
