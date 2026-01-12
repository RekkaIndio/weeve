-- Enable RLS on waitlist
ALTER TABLE "public"."waitlist" ENABLE ROW LEVEL SECURITY;

-- Allow public inserts to waitlist
CREATE POLICY "Enable insert for everyone" ON "public"."waitlist"
AS PERMISSIVE FOR INSERT
TO public
WITH CHECK (true);

-- Add indexes for foreign keys
CREATE INDEX IF NOT EXISTS "stories_forked_from_story_id_idx" ON "public"."stories" ("forked_from_story_id");
CREATE INDEX IF NOT EXISTS "stories_group_id_idx" ON "public"."stories" ("group_id");
CREATE INDEX IF NOT EXISTS "stories_reviewed_by_idx" ON "public"."stories" ("reviewed_by");
CREATE INDEX IF NOT EXISTS "stories_brand_id_idx" ON "public"."stories" ("brand_id");
CREATE INDEX IF NOT EXISTS "stories_collab_initiator_id_idx" ON "public"."stories" ("collab_initiator_id");
CREATE INDEX IF NOT EXISTS "stories_collab_target_id_idx" ON "public"."stories" ("collab_target_id");
CREATE INDEX IF NOT EXISTS "stories_creator_id_idx" ON "public"."stories" ("creator_id");

CREATE INDEX IF NOT EXISTS "contributions_story_id_idx" ON "public"."contributions" ("story_id");
CREATE INDEX IF NOT EXISTS "contributions_user_id_idx" ON "public"."contributions" ("user_id");
CREATE INDEX IF NOT EXISTS "contributions_reviewed_by_idx" ON "public"."contributions" ("reviewed_by");

CREATE INDEX IF NOT EXISTS "story_participants_user_id_idx" ON "public"."story_participants" ("user_id");

CREATE INDEX IF NOT EXISTS "conversations_creator_id_idx" ON "public"."conversations" ("creator_id");

CREATE INDEX IF NOT EXISTS "messages_reply_to_id_idx" ON "public"."messages" ("reply_to_id");
CREATE INDEX IF NOT EXISTS "messages_sender_id_idx" ON "public"."messages" ("sender_id");

CREATE INDEX IF NOT EXISTS "comment_likes_user_id_idx" ON "public"."comment_likes" ("user_id");
CREATE INDEX IF NOT EXISTS "comment_likes_comment_id_idx" ON "public"."comment_likes" ("comment_id");

CREATE INDEX IF NOT EXISTS "group_messages_sender_id_idx" ON "public"."group_messages" ("sender_id");
CREATE INDEX IF NOT EXISTS "group_messages_group_id_idx" ON "public"."group_messages" ("group_id");
CREATE INDEX IF NOT EXISTS "group_messages_reply_to_id_idx" ON "public"."group_messages" ("reply_to_id");

CREATE INDEX IF NOT EXISTS "message_likes_message_id_idx" ON "public"."message_likes" ("message_id");
CREATE INDEX IF NOT EXISTS "message_likes_user_id_idx" ON "public"."message_likes" ("user_id");

CREATE INDEX IF NOT EXISTS "group_message_likes_message_id_idx" ON "public"."group_message_likes" ("message_id");
CREATE INDEX IF NOT EXISTS "group_message_likes_user_id_idx" ON "public"."group_message_likes" ("user_id");

-- Drop unused indexes
DROP INDEX IF EXISTS "public"."idx_story_participants_user_status";
DROP INDEX IF EXISTS "public"."idx_profiles_public";
DROP INDEX IF EXISTS "public"."idx_profiles_brand";
DROP INDEX IF EXISTS "public"."hashtags_name_idx";
