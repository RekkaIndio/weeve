-- Migration: Add comment likes table
-- Run this in Supabase SQL Editor

-- Create comment_likes table
CREATE TABLE IF NOT EXISTS comment_likes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    comment_id UUID NOT NULL REFERENCES story_comments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(comment_id, user_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_comment_likes_comment_id ON comment_likes(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_likes_user_id ON comment_likes(user_id);

-- Enable RLS
ALTER TABLE comment_likes ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Anyone can view comment likes
CREATE POLICY "Anyone can view comment likes" ON comment_likes
    FOR SELECT USING (true);

-- Authenticated users can like comments
CREATE POLICY "Authenticated users can like comments" ON comment_likes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can unlike (delete their own likes)
CREATE POLICY "Users can delete their own likes" ON comment_likes
    FOR DELETE USING (auth.uid() = user_id);
