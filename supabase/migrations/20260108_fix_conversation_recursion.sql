-- Fix Infinite Recursion in Conversation RLS Policies

-- Create a secure helper function to check participation without recursion
-- SECURITY DEFINER ensures this runs with the privileges of the creator (postgres/superuser),
-- bypassing RLS on the conversation_participants table itself during the check.
CREATE OR REPLACE FUNCTION is_conversation_participant(conversation_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM conversation_participants
    WHERE conversation_participants.conversation_id = $1
    AND conversation_participants.user_id = (auth.uid())::text
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update conversation_participants policies
DROP POLICY IF EXISTS "participants_select" ON conversation_participants;
CREATE POLICY "participants_select" ON conversation_participants
  FOR SELECT USING (
    is_conversation_participant(conversation_id)
  );

-- Update conversations policies
DROP POLICY IF EXISTS "conversations_select" ON conversations;
CREATE POLICY "conversations_select" ON conversations
  FOR SELECT USING (
    is_conversation_participant(id)
  );

-- Update messages policies
DROP POLICY IF EXISTS "messages_select" ON messages;
CREATE POLICY "messages_select" ON messages
  FOR SELECT USING (
    is_conversation_participant(conversation_id)
  );

-- We can also optimize the insert check for messages to use the function, 
-- though it wasn't the primary source of recursion, it's good practice.
DROP POLICY IF EXISTS "messages_insert" ON messages;
CREATE POLICY "messages_insert" ON messages
  FOR INSERT WITH CHECK (
    sender_id = (auth.uid())::text AND
    is_conversation_participant(conversation_id)
  );
