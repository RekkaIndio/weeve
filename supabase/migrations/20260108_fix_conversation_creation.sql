-- Fix RLS 403 Error on Conversation Creation
-- Add creator_id to conversations to allow RLS to pass before participants are added

-- 1. Add creator_id column
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS creator_id uuid REFERENCES auth.users(id);

-- 2. Create trigger to automatically set creator_id
CREATE OR REPLACE FUNCTION set_conversation_creator()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.creator_id IS NULL THEN
    NEW.creator_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_set_conversation_creator ON conversations;
CREATE TRIGGER tr_set_conversation_creator
BEFORE INSERT ON conversations
FOR EACH ROW
EXECUTE FUNCTION set_conversation_creator();

-- 3. Update RLS policy to allow creator to see the conversation
-- We keep the is_conversation_participant check for other members
DROP POLICY IF EXISTS "conversations_select" ON conversations;
CREATE POLICY "conversations_select" ON conversations
  FOR SELECT USING (
    creator_id = auth.uid() OR
    is_conversation_participant(id)
  );

-- Backfill creator_id for existing conversations (best effort, using first participant)
