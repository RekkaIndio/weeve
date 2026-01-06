-- Add reply_to_id to messages (Direct Messages)
ALTER TABLE messages ADD COLUMN IF NOT EXISTS reply_to_id UUID REFERENCES messages(id);

-- Create message_likes table (Direct Messages)
CREATE TABLE IF NOT EXISTS message_likes (
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    message_id UUID REFERENCES messages(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (user_id, message_id)
);

-- Add RLS policies for message_likes
ALTER TABLE message_likes ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Users can like messages in conversations they are part of'
    ) THEN
        CREATE POLICY "Users can like messages in conversations they are part of"
            ON message_likes FOR INSERT
            WITH CHECK (
                EXISTS (
                    SELECT 1 FROM conversation_participants cp
                    JOIN messages m ON m.conversation_id = cp.conversation_id
                    WHERE m.id = message_likes.message_id
                    AND cp.user_id = auth.uid()::text  -- Cast because conversation_participants.user_id is text
                )
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Users can unlike their own likes'
    ) THEN
        CREATE POLICY "Users can unlike their own likes"
            ON message_likes FOR DELETE
            USING (user_id = auth.uid()); -- message_likes.user_id is UUID (from table creation above), auth.uid() is UUID. This should be fine.
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Users can view likes for messages in conversations they are part of'
    ) THEN
        CREATE POLICY "Users can view likes for messages in conversations they are part of"
            ON message_likes FOR SELECT
            USING (
                EXISTS (
                    SELECT 1 FROM conversation_participants cp
                    JOIN messages m ON m.conversation_id = cp.conversation_id
                    WHERE m.id = message_likes.message_id
                    AND cp.user_id = auth.uid()::text -- Cast for consistency
                )
            );
    END IF;
END $$;


-- Add reply_to_id to group_messages
ALTER TABLE group_messages ADD COLUMN IF NOT EXISTS reply_to_id UUID REFERENCES group_messages(id);

-- Create group_message_likes table
CREATE TABLE IF NOT EXISTS group_message_likes (
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    message_id UUID REFERENCES group_messages(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (user_id, message_id)
);

-- Add RLS policies for group_message_likes
ALTER TABLE group_message_likes ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Members can like group messages'
    ) THEN
        CREATE POLICY "Members can like group messages"
            ON group_message_likes FOR INSERT
            WITH CHECK (
                EXISTS (
                    SELECT 1 FROM group_messages gm
                    JOIN group_members mem ON mem.group_id = gm.group_id
                    WHERE gm.id = group_message_likes.message_id
                    AND mem.user_id = auth.uid()::text -- Checking if group_members uses text too, likely yes if consistent
                    AND mem.status = 'active'
                )
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Users can unlike their own group message likes'
    ) THEN
        CREATE POLICY "Users can unlike their own group message likes"
            ON group_message_likes FOR DELETE
            USING (user_id = auth.uid());
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Members can view group message likes'
    ) THEN
        CREATE POLICY "Members can view group message likes"
            ON group_message_likes FOR SELECT
            USING (
                EXISTS (
                    SELECT 1 FROM group_messages gm
                    JOIN group_members mem ON mem.group_id = gm.group_id
                    WHERE gm.id = group_message_likes.message_id
                    AND mem.user_id = auth.uid()::text -- Checking if group_members uses text too, likely yes if consistent
                    AND mem.status = 'active'
                )
            );
    END IF;
END $$;
