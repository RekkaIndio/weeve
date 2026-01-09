-- Add soft delete columns to messages table
-- deleted_at: timestamp when the message was deleted (null if not deleted)
-- deleted_by: user_id who deleted the message (for audit purposes)

ALTER TABLE messages
ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN deleted_by TEXT DEFAULT NULL;

-- Create index for filtering non-deleted messages efficiently
CREATE INDEX idx_messages_deleted_at ON messages(deleted_at) WHERE deleted_at IS NULL;

-- RLS policy: Only the sender can soft-delete their own messages
CREATE POLICY "Users can delete their own messages"
ON messages
FOR UPDATE
USING (sender_id = (auth.uid())::text)
WITH CHECK (
    sender_id = (auth.uid())::text 
    AND deleted_at IS NOT NULL 
    AND deleted_by = (auth.uid())::text
);
