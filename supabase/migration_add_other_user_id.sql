-- Add other_user_id to conversation_participants to track the other participant directly
-- This bypasses the RLS limitation where users can only see their own participant rows

-- Add the column
alter table conversation_participants 
add column if not exists other_user_id text references profiles(user_id);

-- Create an index for faster lookups
create index if not exists idx_conversation_participants_other_user 
on conversation_participants(other_user_id);
