-- Migration: Add allow_comments and allow_reuse columns to stories table
-- Run this in Supabase SQL Editor

-- Add allow_comments column (defaults to true for backward compatibility)
ALTER TABLE stories
  ADD COLUMN IF NOT EXISTS allow_comments BOOLEAN DEFAULT TRUE NOT NULL;

-- Add allow_reuse column (defaults to true for backward compatibility)
ALTER TABLE stories
  ADD COLUMN IF NOT EXISTS allow_reuse BOOLEAN DEFAULT TRUE NOT NULL;

-- Create index for allow_comments for faster queries
CREATE INDEX IF NOT EXISTS idx_stories_allow_comments ON stories(allow_comments);

-- Create index for allow_reuse for faster queries
CREATE INDEX IF NOT EXISTS idx_stories_allow_reuse ON stories(allow_reuse);
