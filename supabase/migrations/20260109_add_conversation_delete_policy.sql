-- Add DELETE policy for conversation_participants
-- Allows users to delete their own participation in a conversation

DROP POLICY IF EXISTS "participants_delete" ON conversation_participants;
CREATE POLICY "participants_delete" ON conversation_participants
  FOR DELETE USING (
    user_id = (auth.uid())::text
  );
