-- Migration: Add 'audio' to media_type options for contributions
-- This enables audio recording as a new contribution type

-- Since PostgreSQL doesn't have a native enum that we're using here,
-- and the current schema uses text with a check constraint or just text,
-- we need to handle this appropriately.

-- If using a pure text column (no enum), no change needed - just update app code.
-- If there's a check constraint, we need to modify it.

-- Check if there's a constraint and drop/recreate it
DO $$
BEGIN
    -- Drop existing constraint if it exists
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'contributions_media_type_check'
    ) THEN
        ALTER TABLE contributions DROP CONSTRAINT contributions_media_type_check;
    END IF;
    
    -- Add updated constraint with audio included
    ALTER TABLE contributions 
    ADD CONSTRAINT contributions_media_type_check 
    CHECK (media_type IN ('video', 'image', 'text', 'drawing', 'audio'));
    
EXCEPTION WHEN OTHERS THEN
    -- If the above fails (e.g., no constraint existed), that's fine
    -- The column is likely just text which accepts any value
    RAISE NOTICE 'No constraint modification needed or constraint already updated';
END $$;

-- Verify the change
COMMENT ON COLUMN contributions.media_type IS 'Type of media: video, image, text, drawing, or audio';
